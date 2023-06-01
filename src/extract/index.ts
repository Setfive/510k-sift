import "reflect-metadata";
import * as commandLineArgs from "command-line-args";
import * as winston from "winston";
import { v4 as uuidv4 } from "uuid";
import { ICommandLineArgsExtract, IDeviceJson } from "../types/types";
import { Device } from "../entity/device";
import { appDataSource } from "../db";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const process = require("process");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const util = require("util");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exec = util.promisify(require("child_process").exec);

let DOWNLOADED_PDF_PATH = "/home/ubuntu/pdf_data";
let PDF_TO_TEXT = "/usr/bin/pdftotext";

if (process.env.DOWNLOADED_PDF_PATH) {
  DOWNLOADED_PDF_PATH = process.env.DOWNLOADED_PDF_PATH;
}

if (process.env.PDF_TO_TEXT) {
  PDF_TO_TEXT = process.env.PDF_TO_TEXT;
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.cli(),
    winston.format.timestamp() // adds a timestamp property
  ),
  transports: [new winston.transports.Console()],
});

(async () => {
  const optionDefinitions = [
    { name: "command", alias: "c", type: String },
    { name: "id", type: String },
  ];
  const options: ICommandLineArgsExtract = commandLineArgs(
    optionDefinitions
  ) as ICommandLineArgsExtract;
  await appDataSource.initialize();

  if (options.command === "convertPdfToJson") {
    await convertPdfToJson(options.id);
  } else if (options.command === "createBashConverts") {
    await createBashConverts();
  } else if (options.command === "calculateTokens") {
    await calculateTokens();
  } else if (options.command === "extractIFUForm3881") {
    await extractIFUForm3881();
  } else if (options.command === "extractIFUEmbeddings") {
    await extractIFUEmbeddings();
  }
})();

async function extractIFUEmbeddings() {
  const chunks: number[][] = await getDeviceIdChunks();
  let numChunk = 0;
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(`u.indicationsForUse IS NOT NULL`)
      .orderBy("u.datereceived", "ASC")
      .limit(1000)
      .offset(chunk[0])
      .getMany();
    let num = 0;
    for (const entry of records) {
      await getIFUEmbedding(entry);
      num += 1;
      logger.info(`[${numChunk}/${chunks.length}] ${num}/${records.length}`);
    }

    numChunk += 1;
  }
}

async function getIFUEmbedding(entry: Device): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    const pathToFile = `${os.tmpdir()}/${uuidv4()}.txt`;
    const pathToOutput = `${os.tmpdir()}/${uuidv4()}.txt`;
    const pathToCmd = process.cwd() + "/py-sentence-transformers/index.py";
    fs.writeFileSync(pathToFile, entry.indicationsForUse);

    try {
      const { stdout, stderr } = await exec(
        `${pathToCmd} ${pathToFile} - > ${pathToOutput}`
      );
      const embedding = fs.readFileSync(pathToOutput, "utf8");
      entry.indicationsForUseEmbedding = embedding;
      await appDataSource.manager.save(entry);
    } catch (e) {
      console.error(e.message);
    } finally {
      fs.unlinkSync(pathToFile);
      fs.unlinkSync(pathToOutput);
      resolve();
    }
  });
}

async function extractIFUForm3881() {
  const chunks: number[][] = await getDeviceIdChunks();
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(
        `u.summaryStatementNeedsOCR is null AND u.summaryStatementURL is not null AND u.indicationsForUse IS NULL`
      )
      .orderBy("u.datereceived", "ASC")
      .limit(1000)
      .offset(chunk[0])
      .getMany();
    for (const entry of records) {
      const path = `statement_${entry.knumber}.pdf`;
      const statementText = await extractTextWithPdfToText(path);
      if (!statementText.includes("FORM FDA 3881")) {
        continue;
      }
      const indicationsForUse = statementText
        .substring(
          statementText.indexOf("Indications for Use (Describe)"),
          statementText.indexOf(
            "Type of Use (Select one or both, as applicable)"
          )
        )
        .replace("Indications for Use (Describe)", "")
        .trim();
      entry.indicationsForUse = indicationsForUse;
      await appDataSource.getRepository(Device).save(entry);
      logger.info(entry.knumber);
      // logger.info(indicationsForUse);
    }
  }
}

async function getDeviceIdChunks() {
  const totalRecords = await appDataSource.getRepository(Device).count();
  const chunks: number[][] = [];
  let start = 0;
  let end = 1000;
  while (end < totalRecords) {
    chunks.push([start, end]);
    start += 1000;
    end += 1000;
  }

  return chunks;
}

async function calculateTokens() {
  const chunks: number[][] = await getDeviceIdChunks();

  let totalStringLength = 0;
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(`u.datereceived > '2022-01-01T00:00:00'`)
      .orderBy("u.datereceived", "DESC")
      .limit(1000)
      .offset(chunk[0])
      .getMany();
    for (const record of records) {
      const file = `${process.cwd()}/data/json/${record.knumber}.json`;
      if (!fs.existsSync(file)) {
        continue;
      }
      const data: IDeviceJson = JSON.parse(
        fs.readFileSync(file, "utf8")
      ) as IDeviceJson;
      totalStringLength += data.statementText.split(" ").length;
      totalStringLength += data.foiaText.split(" ").length;
    }
  }

  console.log(`totalStringLength = ${totalStringLength}`);
}

async function createBashConverts() {
  const chunks: number[][] = await getDeviceIdChunks();

  const cmds: string[] = [];
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
      cmds.push(
        `node dist/extract/index.js  --command=convertPdfToJson --id=${record.id}`
      );
    }
  }

  console.log(cmds.join("\n"));
}

async function convertPdfToJson(id: string) {
  if (!id) {
    console.error("You must pass an --id= parameter");
    process.exit(-1);
  }

  const dataDir = process.cwd() + "/data/json";
  if (!fs.existsSync(dataDir)) {
    await fs.mkdirSync(dataDir);
  }
  const entry = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ id: parseInt(id, 10) });
  logger.info(
    `Converting: id=${id}, knumber=${entry.knumber}, deviceName=${entry.devicename}`
  );

  let statementText = "";
  let foiaText = "";
  if (entry.summaryStatementURL) {
    const path = `statement_${entry.knumber}.pdf`;
    statementText = await extractTextWithPdfToText(path);
    if (!statementText) {
      entry.summaryStatementNeedsOCR = true;
    }
  }

  if (entry.foiaURL) {
    const path = `foia_${entry.knumber}.pdf`;
    foiaText = await extractTextWithPdfToText(path);
    if (!foiaText) {
      entry.foiaNeedsOCR = true;
    }
  }

  await appDataSource.getRepository(Device).save(entry);

  const entryJson: Record<string, unknown> = JSON.parse(JSON.stringify(entry));
  entryJson["statementText"] = statementText;
  entryJson["foiaText"] = foiaText;

  const jsonFile = `${dataDir}/${entry.knumber}.json`;
  fs.writeFileSync(jsonFile, JSON.stringify(entryJson, null, 4));
  logger.info(`Wrote ${jsonFile}`);
}

async function extractTextWithPdfToText(path: string): Promise<string> {
  const pdfPath = DOWNLOADED_PDF_PATH + "/" + path;
  try {
    const { stdout, stderr } = await exec(
      `${PDF_TO_TEXT} ${pdfPath} - > /tmp/output.txt`
    );
    // TODO: probably should do something if theres a stderr?
    const data = fs.readFileSync("/tmp/output.txt", "utf8");
    return data.trim();
  } catch (e) {
    return "";
  }
}

async function extractTextWithOCR(path: string): Promise<string> {
  // TODO: Implement this
  return "";
}
