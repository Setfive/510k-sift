import { getOpenAI } from "../openai";
import { LOGGER } from "../logger";
import { getProductCode } from "../fetch/productCodes";

export async function generateAIDescriptionForProductCode(code: string) {
  try {
    const productCodeDTO = await getProductCode(code);
    const openai = getOpenAI();
    const prompt = `You're an expert FDA consultant working with data from 510(k).
Use only the details provided by the user to respond to their question`;
    const user = `These are details about a FDA 510(k) product code along with the device names for 
some products that are cleared in this product code. Use only these details to generate an executive summary for this product code.
In the executive summary make sure to include: 
  * a description of the types of devices that this product code is appropriate for
  * if these devices are typically prescription or over the counter
  * the audience these products are marketed to
  * any risks commonly associated with product using this product code
Do not include the phrase "Executive Summary:"

Product Code: ${productCodeDTO.productCode} 
Description: ${productCodeDTO.deviceName}
Device Class: ${productCodeDTO.deviceClass}
Devices:
${productCodeDTO.devices
  .slice(0, 5)
  .map((item) => item.deviceName)
  .join("\n")}`;

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

    const text = `${completion.data.choices[0].message?.content}`
      .trim()
      .replace("Executive Summary:", "");
    return text;
  } catch (e) {
    console.error(e);
    LOGGER.error(e);
  }

  return "";
}
