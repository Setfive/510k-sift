import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
dotenv.config();

export function getOpenAI() {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  });
  return new OpenAIApi(configuration);
}
