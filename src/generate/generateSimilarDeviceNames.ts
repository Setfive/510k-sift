import { Device } from "../entity/device";
import { appDataSource } from "../db";
import { LOGGER } from "../logger";
import { DeviceRelatedDevice } from "../entity/deviceRelatedDevice";
import { QdrantClient } from "@qdrant/js-client-rest";

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
    const existing = await appDataSource
      .getRepository(DeviceRelatedDevice)
      .findOneBy({ sDevice: { id: device.id }, dDevice: { id: dd.id } });
    if (existing) {
      continue;
    }
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
