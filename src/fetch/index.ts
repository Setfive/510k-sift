import { appDataSource } from "../db";
import { Device } from "../entity/device";

export async function getDeviceDTOForKNumber(knumber: string) {
  const item = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ knumber });
}
