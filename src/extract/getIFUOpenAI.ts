import axios from "axios";
import { Device } from "../entity/device";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
import {
  extractTextAsPagesWithPdfToText,
  extractTextWithPdfToText,
} from "./pdfToText";

import { Configuration, OpenAIApi } from "openai";
import { LOGGER } from "../server";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function getIFUOpenAI(device: Device): Promise<string> {
  let pathToFile = "";

  try {
    const axioResult = await axios.get<string>(device.summaryStatementURL, {
      responseType: "arraybuffer",
    });
    pathToFile = `${os.tmpdir()}/${uuidv4()}.pdf`;
    fs.writeFileSync(pathToFile, axioResult.data);

    const texts = await extractTextAsPagesWithPdfToText(pathToFile);
    console.log(texts);

    /*
    const textChunks: string[] = [];
    for (let i = 0; i < text.length; i += 2000) {
      textChunks.push(text.substring(i, i + 2000));
    }

    for (const text of textChunks) {
      const prompt = `You're an expert FDA consultant.
This is an extract from the summary or statement of a 510(k).
Extract the complete indications for use (IFU) from the text. Reply with only the IFU and no other text. 
If none is present reply with None.
Text: ${text}      
      `;

      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
      });

      const ifuText = `${completion.data.choices[0].text}`.trim();
      console.log(ifuText);
      if (!ifuText.includes("None")) {
        return `${ifuText}`;
      }
    }
     */
  } catch (e) {
    console.error(e);
    LOGGER.error(e);
  } finally {
    fs.unlinkSync(pathToFile);
  }

  return "";
}
