import { Device } from "../entity/device";
import { getOpenAI } from "../openai";
import { LOGGER } from "../server";

export async function generateMarketingAudienceOpenAI(
  device: Device
): Promise<string> {
  if (!device.indicationsForUse) {
    LOGGER.error(
      `generateMarketingAudience: Device has no IFU. knumber=${device.knumber}`
    );
    return "";
  }
  try {
    const openai = getOpenAI();
    const prompt = `You're an expert FDA consultant working with data from 510(k).
Use only the provided indications for use (IFU) for the device and the device name.
In 1 paragraph, describe the best audience of medical professionals to market this device to. For example, a stent would best be marketed to cardiologists.
Device Name: ${device.devicename}
Indications for use:
${device.indicationsForUse?.trim()}`;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1000,
    });

    const text = `${completion.data.choices[0].text}`.trim();
    return text;
  } catch (e) {
    console.error(e);
    LOGGER.error(e);
  }

  return "";
}
