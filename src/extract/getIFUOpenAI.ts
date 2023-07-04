import axios from "axios";
import { Device } from "../entity/device";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
import { extractTextAsPagesWithPdfToText } from "./pdfToText";
import { LOGGER } from "../server";
import { getOpenAI } from "../openai";

export async function getIFUOpenAI(device: Device): Promise<string> {
  const openai = getOpenAI();
  let pathToFile = "";

  try {
    const axioResult = await axios.get<string>(device.summaryStatementURL, {
      responseType: "arraybuffer",
    });
    pathToFile = `${os.tmpdir()}/${uuidv4()}.pdf`;
    fs.writeFileSync(pathToFile, axioResult.data);

    const texts = await extractTextAsPagesWithPdfToText(pathToFile);

    for (const text of texts) {
      if (!text.toLowerCase().includes("indications for use")) {
        continue;
      }

      const prompt = `You're an expert FDA consultant working on a 510(k).
This is a page from the summary or statement of a 510(k).
Extract the complete indications for use (IFU) from the text. Reply with only the IFU and no other text.
Only consider the text in the prompt, do not consider any other information.
If none is present reply with None.
Text: ${text.trim()}      
      `;

      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 1000,
      });

      LOGGER.info(`getIFUOpenAI: Trying ${text.substring(0, 100)}`);
      const ifuText = `${completion.data.choices[0].text}`.trim();

      if (!ifuText.includes("None")) {
        return `${ifuText}`;
      }
    }
  } catch (e) {
    console.error(e);
    LOGGER.error(e);
  } finally {
    fs.unlinkSync(pathToFile);
  }

  return "";
}
