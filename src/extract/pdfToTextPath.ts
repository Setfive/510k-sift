import * as dotenv from "dotenv";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const process = require("process");

dotenv.config();

export function getPdfToTextPath() {
  let PDF_TO_TEXT = "/usr/bin/pdftotext";
  if (process.env.PDF_TO_TEXT) {
    PDF_TO_TEXT = process.env.PDF_TO_TEXT;
  }
  return PDF_TO_TEXT;
}

export function getPdfTkPath() {
  let PDF_TK = "/usr/bin/pdftk";
  if (process.env.PDF_TK) {
    PDF_TK = process.env.PDF_TK;
  }
  return PDF_TK;
}
