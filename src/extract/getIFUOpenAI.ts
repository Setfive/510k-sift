import axios from "axios";
import { Device } from "../entity/device";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
import { extractTextWithPdfToText } from "./pdfToText";

export async function getIFUOpenAI(device: Device): Promise<string> {
  let pathToFile = "";

  try {
    const axioResult = await axios.get<string>(device.summaryStatementURL, {
      responseType: "arraybuffer",
    });
    pathToFile = `${os.tmpdir()}/${uuidv4()}.pdf`;
    fs.writeFileSync(pathToFile, axioResult.data);

    const text = await extractTextWithPdfToText(pathToFile);
    const textChunks: string[] = [];
    for (let i = 0; i < text.length; i += 3500) {
      textChunks.push(text.substring(i, i + 3500));
    }
  } catch (e) {
  } finally {
    fs.unlinkSync(pathToFile);
  }

  return "";
}
