import * as dotenv from "dotenv";
import { getPdfToTextPath } from "./pdfToTextPath";
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
