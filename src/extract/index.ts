import "reflect-metadata";
import * as commandLineArgs from "command-line-args";
import * as winston from "winston";
import { ICommandLineArgsExtract, IDeviceJson } from "../types/types";
import { Device } from "../entity/device";
import { appDataSource } from "../db";
import { getEmbedding } from "./getEmbedding";
import { extractTextWithPdfToText } from "./pdfToText";
import { getRelatedKNumbers } from "./getRelatedKNumbers";
import * as moment from "moment";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { generateSimilarDeviceNames } from "../generate/generateSimilarDeviceNames";
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
import { QdrantClient } from "@qdrant/js-client-rest";
import { LOGGER } from "../logger";

let DOWNLOADED_PDF_PATH = "/home/ubuntu/pdf_data";
if (process.env.DOWNLOADED_PDF_PATH) {
  DOWNLOADED_PDF_PATH = process.env.DOWNLOADED_PDF_PATH;
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
  } else if (options.command === "extractRelatedKNumbers") {
    await extractRelatedKNumbers();
  } else if (options.command === "dumpToJson") {
    await dumpToJson();
  } else if (options.command === "importFromJson") {
    await importFromJson();
  } else if (options.command === "createDeviceNameEmbeddings") {
    await createDeviceNameEmbeddings(options.id);
  } else if (options.command === "createDeviceEmbeddingBash") {
    await createDeviceEmbeddingBash();
  } else if (options.command === "generateSimilarDeviceNames") {
    await generateSimilarDeviceNames(options.id);
  } else if (options.command === "createGenerateSimilarDeviceNamesBash") {
    await createGenerateSimilarDeviceNamesBash();
  } else if (options.command === "createVectorDB") {
    await createVectorDB();
  }

  process.exit(0);
})();

async function createVectorDB() {
  const client = new QdrantClient({ url: process.env.QDRANT_URL });
  const chunks: number[][] = await getDeviceIdPKChunks();

  LOGGER.info("Creating collection...");
  await client.deleteCollection("device_names");
  await client.createCollection("device_names", {
    vectors: { size: 768, distance: "Cosine" },
  });

  LOGGER.info("Created collection...");

  let num = 0;
  for (const chunk of chunks) {
    LOGGER.info(`${num} / ${chunks.length}`);

    const devices = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where("u.id IN (:...ids)")
      .setParameter("ids", chunk)
      .getMany();
    const points = devices.map((item) => {
      return {
        id: item.id,
        vector: JSON.parse(item.deviceNameEmbedding) as number[],
        payload: {},
      };
    });

    await client.upsert("device_names", { wait: true, points });

    num += 1;
  }
}

async function createGenerateSimilarDeviceNamesBash() {
  const chunks: number[][] = await getDeviceIdPKChunks();
  for (const chunk of chunks) {
    for (const id of chunk) {
      console.log(
        `node dist/extract/index.js  --command=generateSimilarDeviceNames --id=${id}`
      );
    }
  }
}

async function createDeviceEmbeddingBash() {
  const chunks: number[][] = await getDeviceIdPKChunks();
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where("u.deviceNameEmbedding IS NULL AND u.id IN (:...ids)")
      .setParameter("ids", chunk)
      .getMany();
    for (const record of records) {
      console.log(
        `node dist/extract/index.js  --command=createDeviceNameEmbeddings --id=${record.id}`
      );
    }
  }
}

async function createDeviceNameEmbeddings(id: string) {
  const device = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ id: parseInt(id) });
  const embedding = await getEmbedding(`${device.devicename}`);
  device.deviceNameEmbedding = embedding;
  await appDataSource.manager.save(device);
}

async function importFromJson() {
  const dataDir = process.cwd() + "/data/json";
  const files = fs.readdirSync(dataDir);

  let itemsForInsert: QueryDeepPartialEntity<Device>[] = [];
  let num = 0;
  for (const f of files) {
    const data: Record<string, string> = JSON.parse(
      fs.readFileSync(`${dataDir}/${f}`)
    );
    const device = new Device();

    for (const [key, val] of Object.entries(data)) {
      (device as any)[key] = val;
    }

    if (data.datereceived) {
      device.datereceived = moment(data.datereceived, "YYYY-MM-DD").toDate();
    }

    if (data.decisiondate) {
      device.decisiondate = moment(data.decisiondate, "YYYY-MM-DD").toDate();
    }

    if (itemsForInsert.length === 5000) {
      await appDataSource
        .createQueryBuilder()
        .insert()
        .into(Device)
        .values(itemsForInsert)
        .execute();
      itemsForInsert = [];
    }

    itemsForInsert.push(device);

    num += 1;
    logger.info(`${num} / ${files.length}`);
  }

  await appDataSource
    .createQueryBuilder()
    .insert()
    .into(Device)
    .values(itemsForInsert)
    .execute();
}

async function dumpToJson() {
  const dataDir = process.cwd() + "/data/json";
  const chunks: number[][] = await getDeviceIdPKChunks();
  let numChunk = 0;
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where("u.id IN (:...ids)")
      .setParameter("ids", chunk)
      .getMany();
    let num = 0;
    for (const entry of records) {
      if (entry.datereceived) {
        entry.datereceived = moment(entry.datereceived).format(
          "YYYY-MM-DD"
        ) as any;
      }

      if (entry.decisiondate) {
        entry.decisiondate = moment(entry.decisiondate).format(
          "YYYY-MM-DD"
        ) as any;
      }
      const data = JSON.stringify(entry);
      fs.writeFileSync(`${dataDir}/${entry.knumber}.json`, data);
      num += 1;
      logger.info(`[${numChunk}/${chunks.length}] ${num}/${records.length}`);
    }
    numChunk += 1;
  }
}

async function extractRelatedKNumbers() {
  const chunks: number[][] = await getDeviceIdPKChunks();
  let numChunk = 0;
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(`u.indicationsForUse IS NOT NULL AND u.id IN (:...ids)`)
      .orderBy("u.datereceived", "ASC")
      .setParameter("ids", chunk)
      .getMany();
    let num = 0;
    for (const entry of records) {
      const relatedKs = await getRelatedKNumbers(entry);
      entry.relatedKNumbers = JSON.stringify(relatedKs);
      await appDataSource.manager.save(entry);
      num += 1;
      logger.info(`[${numChunk}/${chunks.length}] ${num}/${records.length}`);
    }
    numChunk += 1;
  }
}

async function extractIFUEmbeddings() {
  const chunks: number[][] = await getDeviceIdPKChunks();
  let numChunk = 0;
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(`u.indicationsForUse IS NOT NULL AND u.id IN (:...ids)`)
      .orderBy("u.datereceived", "ASC")
      .setParameter("ids", chunk)
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
    try {
      const embedding = await getEmbedding(entry.indicationsForUse);
      entry.indicationsForUseEmbedding = embedding;
      await appDataSource.manager.save(entry);
    } catch (e) {
      console.error(e.message);
    }

    resolve();
  });
}

async function extractIFUForm3881() {
  const chunks: number[][] = await getDeviceIdPKChunks();
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(
        `u.id IN (:...ids) AND u.summaryStatementNeedsOCR is null AND u.summaryStatementURL is not null AND u.indicationsForUse IS NULL`
      )
      .orderBy("u.datereceived", "ASC")
      .setParameter("ids", chunk)
      .getMany();
    for (const entry of records) {
      const path = `statement_${entry.knumber}.pdf`;
      const statementText = await extractTextWithPdfToText(
        `${DOWNLOADED_PDF_PATH}/${path}`
      );
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

export async function getDeviceIdPKChunks(step = 1000) {
  const rows = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .orderBy("u.id", "ASC")
    .select("u.id AS id")
    .getRawMany<{ id: number }>();

  const ids = rows.map((item) => item.id);
  const chunks: number[][] = [];

  let start = 0;
  let end = step;
  while (end < ids.length) {
    chunks.push(ids.slice(start, end));
    start += step;
    end += step;
  }

  return chunks;
}

async function calculateTokens() {
  const chunks: number[][] = await getDeviceIdPKChunks();

  let totalStringLength = 0;
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(`u.datereceived > '2022-01-01T00:00:00' AND u.id IN (:...ids)`)
      .orderBy("u.datereceived", "DESC")
      .setParameter("ids", chunk)
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
  const chunks: number[][] = await getDeviceIdPKChunks();

  const cmds: string[] = [];
  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where(
        "u.id IN (:...ids) AND u.summaryStatementURL IS NOT NULL OR u.foiaURL IS NOT NULL"
      )
      .setParameter("ids", chunk)
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
    statementText = await extractTextWithPdfToText(
      `${DOWNLOADED_PDF_PATH}/${path}`
    );
    if (!statementText) {
      entry.summaryStatementNeedsOCR = true;
    }
  }

  if (entry.foiaURL) {
    const path = `foia_${entry.knumber}.pdf`;
    foiaText = await extractTextWithPdfToText(`${DOWNLOADED_PDF_PATH}/${path}`);
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

async function extractTextWithOCR(path: string): Promise<string> {
  // TODO: Implement this
  return "";
}
