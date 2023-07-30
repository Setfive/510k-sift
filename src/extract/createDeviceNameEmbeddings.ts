import { appDataSource } from "../db";
import { Device } from "../entity/device";
import { getEmbedding } from "./getEmbedding";

export async function createDeviceNameEmbeddings(id: string) {
  const device = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ id: parseInt(id) });
  const embedding = await getEmbedding(`${device.devicename}`);
  device.deviceNameEmbedding = embedding;
  await appDataSource.manager.save(device);
}
