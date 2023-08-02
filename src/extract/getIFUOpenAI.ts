import axios from "axios";
import { Device } from "../entity/device";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
import { extractTextAsPagesWithPdfToText } from "./pdfToText";
import { getOpenAI } from "../openai";
import { LOGGER } from "../logger";
import EventEmitter from "events";
import { extractTextAsPagesWitUnstructured } from "./unstructured";

export async function getIFUOpenAI(
  device: Device,
  ee?: EventEmitter
): Promise<string> {
  const openai = getOpenAI();
  let pathToFile = "";

  if (!device.summaryStatementURL) {
    if (ee) {
      ee.emit(
        "progress",
        "Device has no summaryStatementURL. Unable to process."
      );
    }
    return "";
  }

  try {
    if (ee) {
      ee.emit("progress", `Downloading ${device.summaryStatementURL}`);
    }
    const axioResult = await axios.get<string>(device.summaryStatementURL, {
      responseType: "arraybuffer",
    });
    pathToFile = `${os.tmpdir()}/${uuidv4()}.pdf`;
    fs.writeFileSync(pathToFile, axioResult.data);

    if (ee) {
      ee.emit(
        "progress",
        `Using Unstructured to extract the text. This takes awhile...`
      );
    }
    const texts = await extractTextAsPagesWitUnstructured(pathToFile);

    if (ee) {
      const totalText = texts.join("").length;
      ee.emit(
        "progress",
        `Extracted ${totalText} characters from 510(k) statement or summary.`
      );
    }

    let page = 1;
    for (const text of texts) {
      const prompt = `You're an expert FDA consultant working on a 510(k).
This is a page from the summary or statement of a 510(k).
Extract the complete indications for use (IFU) from the text. Reply with only the IFU and no other text.
The indications for use starts with "Indications for Use:" and then is followed by a description of how the device is used.
Only consider the text in the prompt, do not consider any other information.
Do not include the phrase "Indications for Use" in the response.
If you can not find the "Indications for use", reply with "None".
      `;

      if (ee) {
        ee.emit(
          "progress",
          `Checking page ${page}/${texts.length} for an IFU with ChatGPT`
        );
      }

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `What is the indications for use in this text?${text.trim()}`,
          },
        ],
        max_tokens: 1000,
      });

      const ifuText = `${completion.data.choices[0].message?.content}`.trim();
      LOGGER.info(`getIFUOpenAI: ${ifuText}`);

      if (!ifuText.toLowerCase().includes("none")) {
        return `${ifuText.replace("Indications for Use:", "")}`;
      }

      page += 1;
    }
  } catch (e) {
    console.error(e);
    LOGGER.error(e);
  } finally {
    if (fs.existsSync(pathToFile)) {
      fs.unlinkSync(pathToFile);
    }
  }

  return "";
}
