import "reflect-metadata";
import * as commandLineArgs from "command-line-args";
import * as winston from "winston";
import { ICommandLineArgsExtract } from "../types/types";
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

let DOWNLOADED_PDF_PATH = "/home/ubuntu/pdfdata";
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
  }
})();

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
  const { stdout, stderr } = await exec(`${PDF_TO_TEXT} ${pdfPath} -`);
  // TODO: probably should do something if theres a stderr?
  return stdout.trim();
}

async function extractTextWithOCR(path: string): Promise<string> {
  // TODO: Implement this
  return "";
}
