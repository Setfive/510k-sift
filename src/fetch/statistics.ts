import { IStatisticsDTO } from "./types";
import { appDataSource } from "../db";
import { Device } from "../entity/device";
import * as moment from "moment/moment";

export async function getStatistics(): Promise<IStatisticsDTO> {
  const maxDateResult = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .select("MAX(u.decisiondate) AS maxDate")
    .getRawOne<{ maxDate: string }>();

  let maxDate = "N/A";
  if (maxDateResult?.maxDate) {
    maxDate = moment(maxDateResult?.maxDate).format("MMMM Do YYYY");
  }
  return { latestDecisionDate: maxDate };
}
