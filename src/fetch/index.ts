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
import { getIFUOpenAI } from "../extract/getIFUOpenAI";
import { generateMarketingAudienceOpenAI } from "../generate/generateMarketingAudienceOpenAI";
import { getRelatedKNumbers } from "../extract/getRelatedKNumbers";
import { LOGGER } from "../logger";
import { IPagerResponse, ISearchRequest } from "../types/types";
import * as moment from "moment";
import { ProductCode } from "../entity/productCode";
import EventEmitter from "events";
import { productCodeToDTO } from "./productCodes";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require("os");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nj = require("numjs");
import { QdrantClient } from "@qdrant/js-client-rest";
import { DECISIONS } from "./decisions";
import { DeviceRelatedDevice } from "../entity/deviceRelatedDevice";

export const PER_PAGE = 100;

export async function searchDevices(
  request: ISearchRequest,
  ee: EventEmitter
): Promise<IPagerResponse<IDeviceDTO>> {
  ee.emit("progress", `Building your query...`);

  const query = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .limit(PER_PAGE)
    .orderBy("u.devicename", "ASC");

  if (request.deviceName) {
    ee.emit("progress", `Vector searching for similar devices...`);

    const client = new QdrantClient({ url: process.env.QDRANT_URL });
    const embedding = await getEmbedding(request.deviceName);
    const decodedEmbedding = JSON.parse(embedding) as number[];
    const result = await client.search("device_names", {
      vector: decodedEmbedding,
      limit: 500,
    });
    const ids = result.map((item) => item.id);
    query.where("u.id IN (:...ids)").setParameter("ids", ids);
  }

  if (request.knumber) {
    query
      .andWhere("u.knumber = :knumber")
      .setParameter("knumber", request.knumber);
  }

  if (request.productCodes) {
    query
      .andWhere("u.productcode IN (:...codes)")
      .setParameter("codes", request.productCodes);
  }

  if (request.applicant) {
    query
      .andWhere("u.applicant LIKE :applicant")
      .setParameter("applicant", `${request.applicant}%`);
  }

  if (request.decisionDateGte) {
    const decisionDateGte = moment(request.decisionDateGte, "YYYY-MM-DD");
    if (decisionDateGte.isValid()) {
      query
        .andWhere("u.decisiondate >= :decisionDateGte")
        .setParameter("decisionDateGte", request.decisionDateGte);
    }
  }

  if (request.decisionDateLte) {
    const decisionDateLte = moment(request.decisionDateLte, "YYYY-MM-DD");
    if (decisionDateLte.isValid()) {
      query
        .andWhere("u.decisiondate <= :decisionDateLte")
        .setParameter("decisionDateLte", decisionDateLte.toDate());
    }
  }

  console.log(request.decision);
  if (request.decision) {
    query
      .andWhere("u.decision = :decision")
      .setParameter("decision", request.decision);
  }

  if (request.page > 1) {
    query.offset(request.page * PER_PAGE);
  }

  const result: IDeviceDTO[] = [];

  ee.emit("progress", `Searching the database...`);
  const devicesAndCount = await query.getManyAndCount();

  ee.emit("progress", `Building your results...`);
  for (const device of devicesAndCount[0]) {
    const item = await shallowDeviceToDTO(device);
    result.push(item);
  }

  const pagerResult: IPagerResponse<IDeviceDTO> = {
    data: result,
    total: devicesAndCount[1],
    paginated: devicesAndCount[1] > PER_PAGE,
    pages: Math.floor(devicesAndCount[1] / PER_PAGE),
  };

  return pagerResult;
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

export async function getMarketingAudienceForDevice(knumber: string) {
  const item = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ knumber });
  const deviceMarketingAudience = await generateMarketingAudienceOpenAI(item);
  if (deviceMarketingAudience) {
    item.deviceMarketingAudience = deviceMarketingAudience;
  } else {
    item.deviceMarketingAudience = "N/A";
  }

  await appDataSource.manager.save(item);

  return deviceToDTO(item);
}

export async function getIFUForDeviceKNumber(
  knumber: string,
  ee: EventEmitter
): Promise<IDeviceDTO> {
  const item = await appDataSource
    .getRepository(Device)
    .findOneByOrFail({ knumber });

  if (!item.indicationsForUseAI && item.summaryStatementURL) {
    const indicationsForUse = await getIFUOpenAI(item, ee);
    if (indicationsForUse) {
      ee.emit("progress", `Extracted IFU. Generating search embedding...`);

      const embedding = await getEmbedding(indicationsForUse);
      item.indicationsForUseAI = indicationsForUse;
      item.indicationsForUseEmbedding = embedding;
    } else {
      item.indicationsForUseAI = "N/A";
    }
    LOGGER.info(
      `getIFUForDeviceKNumber: KNumber=${knumber}, IFU=${indicationsForUse}`
    );
  }

  await appDataSource.manager.save(item);

  const deviceDto = deviceToDTO(item);

  return deviceDto;
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

export async function deviceToDTO(device: Device): Promise<IDeviceDTO> {
  const result = await shallowDeviceToDTO(device);
  const similarDevices = await appDataSource
    .getRepository(DeviceRelatedDevice)
    .createQueryBuilder("u")
    .leftJoinAndSelect("u.dDevice", "dDevice")
    .where("u.sDevice.id = :id")
    .setParameter("id", device.id)
    .getMany();
  for (const d of similarDevices) {
    const dto = await shallowDeviceToDTO(d.dDevice);
    result.similarDevices.push(dto);
  }
  return result;
}

export async function shallowDeviceToDTO(device: Device): Promise<IDeviceDTO> {
  const addressParts: string[] = [
    device.street1,
    device.street2,
    `${device.city},`,
    device.state,
    device.postal_code,
    device.country_code,
  ];

  const decisionDateFormatted = moment(device.decisiondate).format(
    "MMMM Do YYYY"
  );

  const receivedDateFormatted = moment(device.datereceived).format(
    "MMMM Do YYYY"
  );

  const decisionLabel = DECISIONS.find(
    (item) => item.key === device.decision
  )?.value;

  const address = addressParts.filter((item) => item?.trim().length).join(" ");
  const item: IDeviceDTO = {
    knumber: device.knumber,
    deviceName: device.devicename,
    applicant: device.applicant,
    contact: device.contact,
    address: address,
    dateReceived: receivedDateFormatted,
    decisionDate: decisionDateFormatted,
    decision: device.decision as Decision,
    decisionLabel: `${decisionLabel}`,
    productCode: device.productcode,
    statementOrSummary: device.stateorsumm as StatementOrSummary,
    type: device.type as SubmissionType,
    summaryStatementURL: device.summaryStatementURL,
    indicationsForUse: device.indicationsForUseAI,
    deviceMarketingAudience: device.deviceMarketingAudience,
    indicationsForUseAI: device.indicationsForUseAI,
    similarDevices: [],
  };

  if (device.relatedKNumbers) {
    item.relatedKNumbers = JSON.parse(device.relatedKNumbers);
  }

  const productCode = await appDataSource
    .getRepository(ProductCode)
    .findOneBy({ productCode: device.productcode });
  if (productCode) {
    item.productCodeDto = await productCodeToDTO(productCode);
  }
  return item;
}
