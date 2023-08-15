import { appDataSource } from "../db";
import { Device } from "../entity/device";

export async function getDeviceIdPKChunks(step = 1000) {
  const rows = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .orderBy("u.id", "ASC")
    .select("u.id AS id")
    .getRawMany<{ id: number }>();

  const ids = rows.map((item) => item.id);
  const chunks: number[][] = [];

  let start = 0;
  let end = step;
  while (end < ids.length) {
    chunks.push(ids.slice(start, end));
    start += step;
    end += step;
  }

  return chunks;
}
