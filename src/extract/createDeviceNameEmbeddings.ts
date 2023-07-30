import { appDataSource } from "../db";
import { Device } from "../entity/device";
import { getEmbedding } from "./getEmbedding";

export async function createDeviceNameEmbeddings(id: string) {
  const device = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ id: parseInt(id) });
  await setDeviceNameEmbedding(device);
}

export async function setDeviceNameEmbedding(device: Device) {
  const embedding = await getEmbedding(`${device.devicename}`);
  device.deviceNameEmbedding = embedding;
  await appDataSource.manager.save(device);
  return embedding;
}
