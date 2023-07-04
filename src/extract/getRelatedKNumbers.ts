import { Device } from "../entity/device";
import { LOGGER } from "../server";
import axios from "axios";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
import { v4 as uuidv4 } from "uuid";
import { extractTextWithPdfToText } from "./pdfToText";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

export async function getRelatedKNumbers(device: Device) {
  if (!device.summaryStatementURL) {
    return [];
  }
  const pathToFile = `${os.tmpdir()}/${uuidv4()}.pdf`;
  try {
    const axioResult = await axios.get<string>(device.summaryStatementURL, {
      responseType: "arraybuffer",
    });
    fs.writeFileSync(pathToFile, axioResult.data);
    const pdfText = await extractTextWithPdfToText(pathToFile);
    const re = /K\d{6}/gm;
    const matches = pdfText.match(re);
    return [...new Set<string>(matches)];
  } catch (e) {
    console.error(e);
    LOGGER.error(e);
  } finally {
    fs.unlinkSync(pathToFile);
  }

  return [];
}
