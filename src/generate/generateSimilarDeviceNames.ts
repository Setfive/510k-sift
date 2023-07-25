import { Device } from "../entity/device";
import { getEmbedding } from "../extract/getEmbedding";
import { appDataSource } from "../db";
import { getDeviceIdPKChunks } from "../extract";
import { LOGGER } from "../logger";
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

  const idChunks = await getDeviceIdPKChunks();
  let results: ISimilarDeviceDotProduct[] = [];

  for (const chunk of idChunks) {
    const records = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where("u.id IN (:...ids)")
      .setParameter("ids", chunk)
      .getMany();

    for (const record of records) {
      const embedding = JSON.parse(record.deviceNameEmbedding) as number[];
      const njEmbedding = nj.array(embedding);
      const dot = nj.dot(njTargetEmbedding, njEmbedding);
      results.push({ distance: dot.selection.data[0], device: record });
      results
        .sort((a, b) => {
          if (a.distance < b.distance) {
            return -1;
          }

          if (a.distance > b.distance) {
            return 1;
          }

          return 0;
        })
        .reverse();
    }

    results = results.slice(0, 5);
    // console.log(results.map((item) => item.distance));
  }

  const names = results.map((i) => i.device.devicename);

  console.log(device.devicename);
  console.log(names);
}
