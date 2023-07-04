import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const process = require("process");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const util = require("util");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exec = util.promisify(require("child_process").exec);

export async function getEmbedding(val: string): Promise<string> {
  const pathToFile = `${os.tmpdir()}/${uuidv4()}.txt`;
  const pathToOutput = `${os.tmpdir()}/${uuidv4()}.txt`;
  const pathToCmd = process.cwd() + "/py-sentence-transformers/index.py";
  fs.writeFileSync(pathToFile, val);

  try {
    const { stdout, stderr } = await exec(
      `${pathToCmd} ${pathToFile} - > ${pathToOutput}`
    );
    const embedding = fs.readFileSync(pathToOutput, "utf8");
    return embedding;
  } catch (e) {
    console.error(e.message);
  } finally {
    if (fs.existsSync(pathToFile)) {
      fs.unlinkSync(pathToFile);
    }

    if (fs.existsSync(pathToOutput)) {
      fs.unlinkSync(pathToOutput);
    }
  }

  return "";
}
