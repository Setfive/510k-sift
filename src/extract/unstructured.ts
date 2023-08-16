import axios from "axios";
import { LOGGER } from "../logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

export async function extractTextAsPagesWitUnstructured(
  pdfPath: string
): Promise<string[]> {
  const result: string[] = [];

  try {
    const response = await axios.post<IUnstructuredElement[]>(
      `${process.env.UNSTRUCTURED_URL}`,
      {
        files: fs.createReadStream(pdfPath),
        strategy: "auto",
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const keyedPages: Map<number, string[]> = new Map<number, string[]>();
    for (const element of response.data) {
      let pages: string[] = [];
      if (keyedPages.has(element.metadata.page_number)) {
        pages = keyedPages.get(element.metadata.page_number) ?? [];
      }
      pages.push(element.text);
      keyedPages.set(element.metadata.page_number, pages);
    }

    for (const p of [...keyedPages.keys()].sort()) {
      const page = keyedPages.get(p);
      if (page) {
        result.push(page.join(" "));
      }
    }
  } catch (error) {
    LOGGER.error(`extractTextAsPagesWitUnstructured: ${error.message}`);
  }
  return result;
}

interface IUnstructuredElement {
  type: string;
  element_id: string;
  text: string;
  metadata: {
    filename: string;
    filetype: string;
    page_number: number;
  };
}
