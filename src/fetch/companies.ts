import { ICompanySearchRequest, IPagerResponse } from "../types/types";
import { appDataSource } from "../db";
import { ProductCode } from "../entity/productCode";
import { PER_PAGE, shallowDeviceToDTO } from "./index";
import { Device } from "../entity/device";
import { IApplicantDTO, ICompanyDTO, IProductCodeDTO } from "./types";
import { productCodeToDTO } from "./productCodes";
import { Applicant } from "../entity/applicant";
import { shallowApplicantToDTO } from "./shallowApplicantToDTO";
import EventEmitter from "events";

export async function fetchCompanies(request: ICompanySearchRequest) {
  const query = await appDataSource
    .getRepository(Applicant)
    .createQueryBuilder("u")
    .select("COUNT(devices.id) AS cnt, u.id AS id")
    .leftJoin("u.devices", "devices")
    .limit(PER_PAGE)
    .groupBy("u.id")
    .orderBy("COUNT(*)", "DESC");

  if (request.name) {
    query
      .andWhere("u.applicant LIKE :name")
      .setParameter("name", `${request.name}%`);
  }

  if (request.page > 1) {
    query.offset(request.page * PER_PAGE);
  }

  const items = await query.getRawMany<{ id: number; cnt: number }>();
  const ids = items.map((i) => i.id);
  const byIdResults = await appDataSource
    .getRepository(Applicant)
    .createQueryBuilder("u")
    .where("u.id IN (:...ids)")
    .setParameter("ids", ids)
    .getMany();
  const countMap: Map<number, Applicant> = new Map<number, Applicant>();
  for (const entry of byIdResults) {
    countMap.set(entry.id, entry);
  }

  const result: IApplicantDTO[] = [];
  for (const entry of items) {
    const applicant = countMap.get(entry.id);
    if (!applicant) {
      continue;
    }
    const dto = await shallowApplicantToDTO(applicant);
    dto.cnt = entry.cnt;
    result.push(dto);
  }

  const count = await query.getCount();
  const pagerResult: IPagerResponse<IApplicantDTO> = {
    data: result,
    total: count,
    paginated: count > PER_PAGE,
    pages: Math.floor(count / PER_PAGE),
  };

  return pagerResult;
}

export async function getCompany(id: string): Promise<IApplicantDTO> {
  const applicant = await appDataSource
    .getRepository(Applicant)
    .findOneByOrFail({ id: parseInt(id, 10) });
  const dto = await shallowApplicantToDTO(applicant);
  const devices = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .where("u.companyId = :companyId")
    .orderBy("u.devicename", "ASC")
    .setParameter("companyId", parseInt(id, 10))
    .getMany();
  for (const item of devices) {
    const deviceDto = await shallowDeviceToDTO(item);
    dto.devices.push(deviceDto);
  }
  const productCodes = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .select("DISTINCT u.productcode AS productCode")
    .where("u.companyId = :companyId AND productCode != ''")
    .orderBy("u.productcode", "ASC")
    .setParameter("companyId", parseInt(id, 10))
    .getRawMany<{ productCode: string }>();
  for (const item of productCodes) {
    dto.productCodes.push(item.productCode);
  }
  return dto;
}
