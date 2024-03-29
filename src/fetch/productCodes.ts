import { IPagerResponse, IProductCodeSearchRequest } from "../types/types";
import {
  IDeviceDTO,
  IProductCodeDTO,
  IProductCodeDTOWithDevices,
} from "./types";
import { appDataSource } from "../db";
import { ProductCode } from "../entity/productCode";
import { deviceToDTO, PER_PAGE, shallowDeviceToDTO } from "./index";
import { Device } from "../entity/device";
import {
  generateAIDescriptionForProductCode,
  getPromptForAIDescriptionForProductCode,
} from "../generate/generateAIDescriptionForProductCode";
import { nl2br } from "../openai/utility";
import { LOGGER } from "../logger";

export async function getProductCodeWithAIDescription(code: string) {
  const productCode = await appDataSource
    .getRepository(ProductCode)
    .findOneByOrFail({ productCode: code });
  const description = await generateAIDescriptionForProductCode(code);
  productCode.aiDescription = nl2br(description);
  await appDataSource.manager.save(productCode);

  return getProductCode(code);
}

export async function getProductCode(code: string) {
  const productCode = await appDataSource
    .getRepository(ProductCode)
    .findOneByOrFail({ productCode: code });
  const productCodeDTO = await productCodeToDTO(productCode);

  const devices = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .where("u.productCode = :productCode")
    .orderBy("u.decisionDate", "DESC")
    .setParameter("productCode", code)
    .getMany();

  const deviceDTOs: IDeviceDTO[] = [];
  for (const item of devices) {
    deviceDTOs.push(await shallowDeviceToDTO(item));
  }
  const result: IProductCodeDTOWithDevices = Object.assign(
    { devices: deviceDTOs },
    productCodeDTO
  );
  return result;
}

export async function getProductCodeReviewPanels() {
  const queryResult = await appDataSource
    .getRepository(ProductCode)
    .createQueryBuilder("u")
    .select("DISTINCT u.reviewPanel AS pc")
    .orderBy("u.reviewPanel", "ASC")
    .getRawMany<{ pc: string }>();

  return queryResult.map((item) => item.pc).filter((item) => item.length);
}

export async function getProductCodeMedicalSpecialities() {
  const queryResult = await appDataSource
    .getRepository(ProductCode)
    .createQueryBuilder("u")
    .select("DISTINCT u.medicalSpeciality AS pc")
    .orderBy("u.medicalSpeciality", "ASC")
    .getRawMany<{ pc: string }>();

  return queryResult.map((item) => item.pc).filter((item) => item.length);
}

export async function searchProductCodes(
  request: IProductCodeSearchRequest
): Promise<IPagerResponse<IProductCodeDTO>> {
  const query = await appDataSource
    .getRepository(ProductCode)
    .createQueryBuilder("u")
    .limit(PER_PAGE)
    .orderBy("u.productCode", "ASC");

  if (request.productCode) {
    query
      .andWhere("u.productCode LIKE :code")
      .setParameter("code", `${request.productCode}%`);
  }

  if (request.deviceName) {
    query
      .andWhere("u.deviceName LIKE :deviceName")
      .setParameter("deviceName", `${request.deviceName}%`);
  }

  if (request.medicalSpeciality) {
    query
      .andWhere("u.medicalSpeciality = :medicalSpeciality")
      .setParameter("medicalSpeciality", `${request.medicalSpeciality}`);
  }

  if (request.reviewPanel) {
    query
      .andWhere("u.reviewPanel = :reviewPanel")
      .setParameter("reviewPanel", `${request.reviewPanel}`);
  }

  if (request.page > 1) {
    query.offset(request.page * PER_PAGE);
  }

  const result: IProductCodeDTO[] = [];
  const itemsAndCount = await query.getManyAndCount();
  for (const productCode of itemsAndCount[0]) {
    const item = await shallowProductCodeToDTO(productCode);
    result.push(item);
  }

  const pagerResult: IPagerResponse<IProductCodeDTO> = {
    data: result,
    total: itemsAndCount[1],
    paginated: itemsAndCount[1] > PER_PAGE,
    pages: Math.floor(itemsAndCount[1] / PER_PAGE),
    sortedBy: "Alphabetically by product code",
  };

  return pagerResult;
}

export async function shallowProductCodeToDTO(
  productCode: ProductCode
): Promise<IProductCodeDTO> {
  return {
    productCode: productCode.productCode,
    reviewPanel: productCode.reviewPanel,
    medicalSpeciality: productCode.medicalSpeciality,
    deviceName: productCode.deviceName,
    deviceClass: productCode.deviceClass,
    regulationNumber: productCode.regulationNumber,
    aiDescription: productCode.aiDescription,
  };
}

export async function productCodeToDTO(
  productCode: ProductCode
): Promise<IProductCodeDTO> {
  const result = await shallowProductCodeToDTO(productCode);
  result.prompt = await getPromptForAIDescriptionForProductCode(productCode);
  return result;
}
