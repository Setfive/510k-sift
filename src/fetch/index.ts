import { appDataSource } from "../db";
import { Device } from "../entity/device";
import {
  Decision,
  IDeviceDotResult,
  IDeviceDTO,
  IDeviceDTODotResult,
  StatementOrSummary,
  SubmissionType,
} from "./types";
import { getEmbedding } from "../extract/getEmbedding";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
import { getIFUOpenAI } from "../extract/getIFUOpenAI";
import { generateMarketingAudienceOpenAI } from "../generate/generateMarketingAudienceOpenAI";
import { getRelatedKNumbers } from "../extract/getRelatedKNumbers";
import { LOGGER } from "../logger";
import { ISearchRequest } from "../types/types";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nj = require("numjs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

export async function searchDevices(
  request: ISearchRequest
): Promise<IDeviceDTO[]> {
  const query = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .limit(500)
    .orderBy("u.devicename", "ASC");

  if (request.deviceName) {
    query
      .andWhere("u.devicename LIKE :devicename")
      .setParameter("devicename", `%${request.deviceName}%`);
  }

  const result: IDeviceDTO[] = [];
  const devices = await query.getMany();
  for (const device of devices) {
    const item = await deviceToDTO(device);
    result.push(item);
  }
  return result;
}

export async function similaritySearchIFUs(
  search: string
): Promise<IDeviceDTODotResult[]> {
  const idVals: { id: number }[] = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .select("u.id AS id")
    .where("u.indicationsForUseEmbedding IS NOT NULL")
    .orderBy("u.id", "ASC")
    .getRawMany<{ id: number }>();
  const ids = idVals.map((item) => item.id);
  const idChunks: number[][] = [];
  for (let i = 0; i < ids.length; i += 2500) {
    idChunks.push(ids.slice(i, i + 2500));
  }

  const result: IDeviceDTODotResult[] = [];
  const embedding = await getEmbedding(search);
  const queryVect = nj.array(JSON.parse(embedding));

  let vectorResults: IDeviceDotResult[] = [];

  for (const idList of idChunks) {
    const devices = await appDataSource
      .getRepository(Device)
      .createQueryBuilder("u")
      .where("u.id IN (:...ids)")
      .setParameter("ids", idList)
      .getMany();
    for (const d of devices) {
      const deviceVect = nj.array(JSON.parse(d.indicationsForUseEmbedding));
      const val = nj.dot(deviceVect, queryVect);

      vectorResults.push({ data: Math.abs(val.selection.data[0]), device: d });
      vectorResults = vectorResults
        .sort((a, b) => {
          if (a.data < b.data) {
            return -1;
          }
          if (a.data > b.data) {
            return 1;
          }
          return 0;
        })
        .reverse()
        .slice(0, 5);
    }
  }

  for (const v of vectorResults) {
    const item = { data: v.data, device: await deviceToDTO(v.device) };
    result.push(item);
  }

  return result;
}

export async function getEnhancedDeviceDTOForKNumber(knumber: string) {
  const item = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ knumber });

  if (!item.indicationsForUseAI && item.summaryStatementURL) {
    const indicationsForUse = await getIFUOpenAI(item);
    if (indicationsForUse) {
      const embedding = await getEmbedding(indicationsForUse);
      item.indicationsForUseAI = indicationsForUse;
      item.indicationsForUseEmbedding = embedding;
    } else {
      item.indicationsForUseAI = "N/A";
    }
    LOGGER.info(
      `getEnhancedDeviceDTOForKNumber: KNumber=${knumber}, IFU=${indicationsForUse}`
    );
  }

  if (
    !item.deviceMarketingAudience &&
    item.indicationsForUseAI &&
    item.indicationsForUseAI !== "N/A"
  ) {
    const deviceMarketingAudience = await generateMarketingAudienceOpenAI(item);
    if (deviceMarketingAudience) {
      item.deviceMarketingAudience = deviceMarketingAudience;
    } else {
      item.deviceMarketingAudience = "N/A";
    }
  }

  if (!item.relatedKNumbers && item.summaryStatementURL) {
    const relatedKs = await getRelatedKNumbers(item);
    item.relatedKNumbers = JSON.stringify(relatedKs);
  }

  await appDataSource.manager.save(item);

  const deviceDto = deviceToDTO(item);

  return deviceDto;
}

export async function getDeviceDTOForKNumber(knumber: string) {
  const item = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ knumber });
  return deviceToDTO(item);
}

async function deviceToDTO(device: Device): Promise<IDeviceDTO> {
  const addressParts: string[] = [
    device.street1,
    device.street2,
    `${device.city},`,
    device.state,
    device.postal_code,
    device.country_code,
  ];

  const address = addressParts.filter((item) => item?.trim().length).join(" ");
  const item: IDeviceDTO = {
    knumber: device.knumber,
    deviceName: device.devicename,
    applicant: device.applicant,
    contact: device.contact,
    address: address,
    dateReceived: device.datereceived,
    decisionDate: device.decisiondate,
    decision: device.decision as Decision,
    productCode: device.productcode,
    statementOrSummary: device.stateorsumm as StatementOrSummary,
    type: device.type as SubmissionType,
    summaryStatementURL: device.summaryStatementURL,
    indicationsForUse: device.indicationsForUseAI,
    deviceMarketingAudience: device.deviceMarketingAudience,
  };

  if (device.relatedKNumbers) {
    item.relatedKNumbers = JSON.parse(device.relatedKNumbers);
  }
  return item;
}
