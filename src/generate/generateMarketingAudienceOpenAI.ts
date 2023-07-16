import { Device } from "../entity/device";
import { getOpenAI } from "../openai";
import { LOGGER } from "../logger";
import { appDataSource } from "../db";
import { ProductCode } from "../entity/productCode";

export async function generateMarketingAudienceOpenAI(
  device: Device
): Promise<string> {
  try {
    let productCodeDescription = "";
    const productCode = await appDataSource
      .getRepository(ProductCode)
      .findOneBy({ productCode: device.productcode });
    if (productCode) {
      productCodeDescription = productCode.deviceName;
    }
    const openai = getOpenAI();
    const prompt = `You're an expert FDA consultant working with data from 510(k).
Use only the provided indications for use (IFU) for the device, the device name, and product code details.`;
    const user = `In 1 paragraph, describe the best audience of medical professionals to market this device to. For example, a stent would best be marketed to cardiologists.
Device Name: ${device.devicename}
Product Code Description: ${productCodeDescription}
Indications for use:
${device.indicationsForUse?.trim()}`;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: user,
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
