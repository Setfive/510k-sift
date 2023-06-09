import "reflect-metadata";
import * as commandLineArgs from "command-line-args";
import * as winston from "winston";
import {
  ICommandLineArgs,
  ICSVEntry,
  ICSVProductCodeEntry,
} from "../types/types";
import {
  CURRENT_MONTH_510k_CSV,
  CURRENT_PRODUCT_CODES_CSV,
  HISTORICAL_510k_CSVs,
} from "./data";
import axios from "axios";
import * as moment from "moment";
import * as yauzl from "yauzl";
import { v4 as uuidv4 } from "uuid";
import * as cheerio from "cheerio";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
import { parse } from "csv-parse/sync";
import { DataSource } from "typeorm";
import { Device } from "../entity/device";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { appDataSource } from "../db";
import { ProductCode } from "../entity/productCode";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.cli(),
    winston.format.timestamp() // adds a timestamp property
  ),
  transports: [new winston.transports.Console()],
});

(async () => {
  const optionDefinitions = [{ name: "command", alias: "c", type: String }];
  const options: ICommandLineArgs = commandLineArgs(
    optionDefinitions
  ) as ICommandLineArgs;
  await appDataSource.initialize();

  if (options.command === "createdb") {
    await createdb();
  } else if (options.command === "getDownloadUrls") {
    await getDownloadUrls();
  } else if (options.command === "download") {
    await download();
  } else if (options.command === "downloadProductCodes") {
    await downloadProductCodes();
  }
})();

async function downloadProductCodes(): Promise<void> {
  return new Promise<void>(async (resolve) => {
    logger.info(`Fetching ${CURRENT_PRODUCT_CODES_CSV}`);
    const result = await axios.get<string>(CURRENT_PRODUCT_CODES_CSV, {
      responseType: "arraybuffer",
    });
    const pathToFile = `${os.tmpdir()}/${uuidv4()}.zip`;
    const pathToCSV = `${os.tmpdir()}/${uuidv4()}.csv`;
    fs.writeFileSync(pathToFile, result.data);

    const productCSV = await new Promise<string>(async (csvResolve) => {
      yauzl.open(pathToFile, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          throw err;
        }

        zipfile.readEntry();
        zipfile.on("entry", (entry) => {
          zipfile.openReadStream(entry, (errInner, readStream) => {
            if (errInner) {
              throw errInner;
            }
            const writeStream = fs.createWriteStream(pathToCSV);
            readStream.pipe(writeStream);
            writeStream.on("close", () => {
              const csvData = fs.readFileSync(pathToCSV, "utf8");
              if (fs.existsSync(pathToFile)) {
                fs.unlinkSync(pathToFile);
              }
              if (fs.existsSync(pathToCSV)) {
                fs.unlinkSync(pathToCSV);
              }
              csvResolve(csvData);
            });
          });
        });
      });
    });

    const records: ICSVProductCodeEntry[] = parse(productCSV, {
      columns: true,
      skip_empty_lines: true,
      delimiter: "|",
      quote: false,
    });

    let num = 0;
    for (const r of records) {
      let productCode = await appDataSource
        .getRepository(ProductCode)
        .findOneBy({ productCode: r.PRODUCTCODE });
      if (!productCode) {
        productCode = new ProductCode();
      }

      productCode.productCode = r.PRODUCTCODE;
      productCode.deviceName = r.DEVICENAME;
      productCode.deviceClass = r.DEVICECLASS;
      productCode.reviewPanel = r.REVIEW_PANEL;
      productCode.medicalSpeciality = r.MEDICALSPECIALTY;
      productCode.regulationNumber = r.REGULATIONNUMBER;

      await appDataSource.manager.save(productCode);
      num += 1;
      logger.info(`downloadProductCodes: ${num}/${records.length}`);
    }

    resolve();
  });
}

async function download() {
  const totalRecords = await appDataSource.getRepository(Device).count();
  const chunks: number[][] = [];
  let start = 0;
  let end = 1000;
  while (end < totalRecords) {
    chunks.push([start, end]);
    start += 1000;
    end += 1000;
  }

  const curls: string[] = [];
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where("u.summaryStatementURL IS NOT NULL OR u.foiaURL IS NOT NULL")
      .orderBy("u.id", "ASC")
      .limit(1000)
      .offset(chunk[0])
      .getMany();
    for (const record of records) {
      if (record.summaryStatementURL) {
        curls.push(
          `curl -o statement_${record.knumber}.pdf ${record.summaryStatementURL}`
        );
      }

      if (record.foiaURL) {
        curls.push(`curl -o foia_${record.knumber}.pdf ${record.foiaURL}`);
      }
    }
  }

  console.log(curls.join("\n"));
}

async function getDownloadUrls() {
  const totalRecords = await appDataSource.getRepository(Device).count();
  const chunks: number[][] = [];
  let start = 0;
  let end = 1000;
  while (end < totalRecords) {
    chunks.push([start, end]);
    start += 1000;
    end += 1000;
  }

  logger.info(`getDownloadUrls: ${chunks.length} chunks!`);

  let num = 0;
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .orderBy("u.id", "ASC")
      .limit(1000)
      .offset(chunk[0])
      .getMany();
    for (const record of records) {
      try {
        const axiosResult = await axios.get<string>(
          `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${record.knumber}`
        );
        const $ = cheerio.load(axiosResult.data);
        $("a").each(async function () {
          const text = ($(this).text() ?? "").trim();
          const ahref = $(this).attr("href") ?? "";
          if (text === "Summary" || text === "Statement") {
            record.summaryStatementURL = ahref;
            logger.info(`${text}: ${ahref}`);
          }

          if (ahref.includes("https://www.accessdata.fda.gov/CDRH510K/")) {
            record.foiaURL = ahref;
            logger.info(`FOIA: ${ahref}`);
          }
        });

        await appDataSource.getRepository(Device).save(record);
      } catch (e) {
        logger.error(e.message);
      }

      num += 1;
      const percent = Math.round((num / totalRecords) * 100);
      logger.info(`${num} / ${totalRecords} (${percent})`);
    }
  }
}

async function createdb() {
  logger.info("Starting createdb...");
  const csvs = HISTORICAL_510k_CSVs.concat([CURRENT_MONTH_510k_CSV]);

  for (const url of csvs) {
    const data = await fetch510kCSV(url);
    const records: ICSVEntry[] = parse(data, {
      columns: true,
      skip_empty_lines: true,
      delimiter: "|",
      quote: false,
    });
    const itemsForInsert: QueryDeepPartialEntity<Device>[] = [];
    for (const record of records) {
      let item: QueryDeepPartialEntity<Device> | Device | null;
      let addToList = false;
      item = await appDataSource
        .getRepository(Device)
        .findOneBy({ knumber: record.KNUMBER });
      if (!item) {
        item = {};
        addToList = true;
      }

      item.knumber = record.KNUMBER;
      item.applicant = record.APPLICANT;
      item.contact = record.CONTACT;
      item.street1 = record.STREET1;
      item.street2 = record.STREET2;
      item.city = record.CITY;
      item.state = record.STATE;
      item.country_code = record.COUNTRY_CODE;
      item.zip = record.ZIP;
      item.postal_code = record.POSTAL_CODE;
      item.datereceived = moment(record.DATERECEIVED, "MM/DD/YYYY").toDate();
      item.decisiondate = moment(record.DECISIONDATE, "MM/DD/YYYY").toDate();
      item.decision = record.DECISION;
      item.reviewadvisecomm = record.REVIEWADVISECOMM;
      item.productcode = record.PRODUCTCODE;
      item.stateorsumm = record.STATEORSUMM;
      item.classadvisecomm = record.CLASSADVISECOMM;
      item.sspindicator = record.SSPINDICATOR;
      item.type = record.TYPE;
      item.thirdparty = record.THIRDPARTY;
      item.expeditedreview = record.EXPEDITEDREVIEW;
      item.devicename = record.DEVICENAME;

      if (addToList) {
        itemsForInsert.push(item);
      }
    }

    for (let i = 0; i < itemsForInsert.length; i += 1000) {
      await appDataSource
        .createQueryBuilder()
        .insert()
        .into(Device)
        .values(itemsForInsert.slice(i, i + 1000))
        .execute();
    }

    const totalRecords = await appDataSource.getRepository(Device).count();
    logger.info(`Total records: ${totalRecords}`);
  }
}

async function fetch510kCSV(url: string): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    logger.info(`Fetching ${url}`);
    const result = await axios.get<string>(url, {
      responseType: "arraybuffer",
    });
    const pathToFile = `${os.tmpdir()}/${uuidv4()}.zip`;
    const pathToCSV = `${os.tmpdir()}/${uuidv4()}.csv`;
    fs.writeFileSync(pathToFile, result.data);
    yauzl.open(pathToFile, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        throw err;
      }
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        zipfile.openReadStream(entry, (errInner, readStream) => {
          if (errInner) {
            throw errInner;
          }
          const writeStream = fs.createWriteStream(pathToCSV);
          readStream.pipe(writeStream);
          writeStream.on("close", () => {
            const csvData = fs.readFileSync(pathToCSV, "utf8");
            if (fs.existsSync(pathToFile)) {
              fs.unlinkSync(pathToFile);
            }
            if (fs.existsSync(pathToCSV)) {
              fs.unlinkSync(pathToCSV);
            }
            resolve(csvData);
          });
        });
      });
    });
  });
}
