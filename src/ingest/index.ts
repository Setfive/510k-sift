import * as commandLineArgs from "command-line-args";
import * as winston from "winston";
import { ICommandLineArgs } from "./types";
import { CURRENT_MONTH_510k_CSV, HISTORICAL_510k_CSVs } from "./data";
import axios from "axios";
import * as yauzl from "yauzl";
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
import { parse } from "csv-parse/sync";

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

  if (options.command === "createdb") {
    await createdb();
  }
})();

async function createdb() {
  logger.info("Starting createdb...");
  const csvs = HISTORICAL_510k_CSVs.concat([CURRENT_MONTH_510k_CSV]);

  const data = await fetch510kCSV(CURRENT_MONTH_510k_CSV);
  const records = parse(data, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "|",
  });
  console.log(records);
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
            fs.unlinkSync(pathToFile);
            fs.unlinkSync(pathToCSV);
            resolve(csvData);
          });
        });
      });
      zipfile.on("end", () => {});
    });
  });
}
