import * as dotenv from "dotenv";
import { getPdfTkPath, getPdfToTextPath } from "./pdfToTextPath";
import { LOGGER } from "../server";
import { v4 as uuidv4 } from "uuid";
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

export async function extractTextAsPagesWithPdfToText(
  pdfPath: string
): Promise<string[]> {
  const PDF_TK = getPdfTkPath();
  const result: string[] = [];

  try {
    const pathToDir = `${os.tmpdir()}/${uuidv4()}`;
    fs.mkdirSync(pathToDir);
    const { stdout, stderr } = await exec(
      `cd ${pathToDir} && ${PDF_TK} ${pdfPath} burst output %03d.pdf`
    );
    const files = fs.readdirSync(pathToDir);
    for (const f of files) {
      if (f.includes(".pdf")) {
        const fullPath = pathToDir + "/" + f;
        const t = await extractTextWithPdfToText(fullPath);
        result.push(t);
      }
    }
  } catch (e) {
    LOGGER.error(e);
  }
  return result;
}

export async function extractTextWithPdfToText(
  pdfPath: string
): Promise<string> {
  const PDF_TO_TEXT = getPdfToTextPath();
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
