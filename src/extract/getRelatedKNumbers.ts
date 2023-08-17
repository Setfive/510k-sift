import { Device } from "../entity/device";
import axios from "axios";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
import { v4 as uuidv4 } from "uuid";
import { extractTextWithPdfToText } from "./pdfToText";
import { extractTextAsPagesWitUnstructured } from "./unstructured";
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
    const pdfTextPages = await extractTextAsPagesWitUnstructured(pathToFile);
    const re = /K\d{6}/gm;
    let matches: string[] = [];
    for (const pdfText of pdfTextPages) {
      const m = pdfText.match(re);
      if (m) {
        matches = matches.concat(m);
      }
    }
    return [...new Set<string>(matches)];
  } catch (e) {
    console.error(e.message);
  } finally {
    if (fs.existsSync(pathToFile)) {
      fs.unlinkSync(pathToFile);
    }
  }

  return [];
}
