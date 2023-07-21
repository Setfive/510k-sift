import { Device } from "../entity/device";
import { getEmbedding } from "../extract/getEmbedding";
import { appDataSource } from "../db";
import { getDeviceIdChunks } from "../extract";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nj = require("numjs");

interface ISimilarDeviceDotProduct {
  distance: number;
  device: Device;
}

export async function generateSimilarDevicesByDeviceName(id: string) {
  const device = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ id: parseInt(id) });
  const targetEmbedding = JSON.parse(device.deviceNameEmbedding) as number[];
  const njTargetEmbedding = nj.array(targetEmbedding);
  const chunks: number[][] = await getDeviceIdChunks();
  const results: ISimilarDeviceDotProduct[] = [];

  for (const chunk of chunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .orderBy("u.id", "ASC")
      .limit(1000)
      .offset(chunk[0])
      .getMany();
    for (const record of records) {
      const embedding = JSON.parse(record.deviceNameEmbedding) as number[];
      const njEmbedding = nj.array(embedding);
      const dot = nj.dot(njTargetEmbedding, njEmbedding);
      results.push({ distance: dot.selection.data[0], device: record });
    }
  }
}
