import { Device } from "../entity/device";
import { getEmbedding } from "../extract/getEmbedding";
import { appDataSource } from "../db";
import { getDeviceIdPKChunks } from "../extract";
import { LOGGER } from "../logger";
import { DeviceRelatedDevice } from "../entity/deviceRelatedDevice";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nj = require("numjs");
import { QdrantClient } from "@qdrant/js-client-rest";

interface ISimilarDeviceDotProduct {
  distance: number;
  device: Device;
}

export async function generateSimilarDeviceNames(id: string) {
  const device = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ id: parseInt(id) });
  const targetEmbedding = JSON.parse(device.deviceNameEmbedding) as number[];

  const client = new QdrantClient({ url: process.env.QDRANT_URL });
  const result = await client.search("device_names", {
    vector: targetEmbedding,
    limit: 5,
  });

  const names: string[] = [];
  for (const d of result) {
    if (d.id === device.id) {
      continue;
    }

    const id = d.id as number;
    const dd = await appDataSource
      .getRepository(Device)
      .findOneByOrFail({ id: id });
    const rd = new DeviceRelatedDevice();
    rd.sDevice = device;
    rd.dDevice = dd;
    rd.relatedType = "similar_device_name";
    await appDataSource.manager.save(rd);

    names.push(dd.devicename);
  }

  LOGGER.info(device.devicename);
  LOGGER.info(names.join(", "));
}
