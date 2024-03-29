import { getOpenAI } from "../openai";
import { LOGGER } from "../logger";
import { getProductCode } from "../fetch/productCodes";
import { ProductCode } from "../entity/productCode";
import { appDataSource } from "../db";
import { Device } from "../entity/device";
import { IDeviceDTO, IPromptDTO } from "../fetch/types";
import { shallowDeviceToDTO } from "../fetch";

export async function getPromptForAIDescriptionForProductCode(
  productCode: ProductCode
): Promise<IPromptDTO> {
  const devices = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .where("u.productCode = :productCode")
    .orderBy("u.decisionDate", "DESC")
    .setParameter("productCode", productCode.productCode)
    .getMany();

  const system = `You're an expert FDA consultant working with data from 510(k).
Use only the details provided by the user to respond to their question`;
  const user = `These are details about a FDA 510(k) product code along with the device names for 
some products that are cleared in this product code. Use only these details to generate an executive summary for this product code.
In the executive summary make sure to include: 
  * a description of the types of devices that this product code is appropriate for
  * if these devices are typically prescription or over the counter
  * the audience these products are marketed to
  * any risks commonly associated with product using this product code
Do not include the phrase "Executive Summary:"

Product Code: ${productCode.productCode} 
Description: ${productCode.deviceName}
Device Class: ${productCode.deviceClass}
Devices:
${devices
  .slice(0, 5)
  .map((item) => item.devicename)
  .join("\n")}`;

  return { system, user };
}

export async function generateAIDescriptionForProductCode(code: string) {
  try {
    const productCode = await appDataSource
      .getRepository(ProductCode)
      .findOneByOrFail({ productCode: code });
    const openai = getOpenAI();
    const prompt = await getPromptForAIDescriptionForProductCode(productCode);
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
