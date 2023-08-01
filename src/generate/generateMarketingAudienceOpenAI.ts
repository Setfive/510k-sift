import { Device } from "../entity/device";
import { getOpenAI } from "../openai";
import { LOGGER } from "../logger";
import { appDataSource } from "../db";
import { ProductCode } from "../entity/productCode";
import { IPromptDTO } from "../fetch/types";

export async function getMarketingAudiencePromptForOpenAI(
  device: Device
): Promise<IPromptDTO> {
  let productCodeDescription = "";
  const productCode = await appDataSource
    .getRepository(ProductCode)
    .findOneBy({ productCode: device.productcode });
  if (productCode) {
    productCodeDescription = productCode.deviceName;
  }

  const system = `You're an expert FDA consultant working with data from 510(k).
Use only the provided indications for use (IFU) for the device, the device name, and product code details.`;
  let user = `In 1 paragraph, describe the best audience of medical professionals to market this device to. For example, a stent would best be marketed to cardiologists.
Device Name: ${device.devicename}
Product Code Description: ${productCodeDescription}`;
  if (device.indicationsForUse) {
    user += `Indications for use:
${device.indicationsForUse.trim()}`;
  }
  return { system, user };
}

export async function generateMarketingAudienceOpenAI(
  device: Device
): Promise<string> {
  try {
    const openai = getOpenAI();
    const prompt = await getMarketingAudiencePromptForOpenAI(device);
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: prompt.user,
        },
      ],
      max_tokens: 1000,
    });

    const text = `${completion.data.choices[0].message?.content}`.trim();
    return text;
  } catch (e) {
    console.error(e);
    LOGGER.error(e);
  }

  return "";
}
