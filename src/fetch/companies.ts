import { ICompanySearchRequest, IPagerResponse } from "../types/types";
import { appDataSource } from "../db";
import { ProductCode } from "../entity/productCode";
import { PER_PAGE } from "./index";
import { Device } from "../entity/device";
import { ICompanyDTO, IProductCodeDTO } from "./types";
import { productCodeToDTO } from "./productCodes";

export async function fetchCompanies(request: ICompanySearchRequest) {
  const query = await appDataSource
    .getRepository(Device)
    .createQueryBuilder("u")
    .select("COUNT(*) AS cnt, u.applicant")
    .limit(PER_PAGE)
    .groupBy("u.applicant")
    .orderBy("COUNT(*)", "DESC");

  if (request.name) {
    query
      .andWhere("u.applicant LIKE :name")
      .setParameter("name", `${request.name}%`);
  }

  const result: ICompanyDTO[] = [];
  const items = await query.getRawMany<{ applicant: string; cnt: number }>();
  const count = await query.getCount();

  for (const entry of items) {
    const item = { name: entry.applicant, cnt: entry.cnt };
    result.push(item);
  }

  const pagerResult: IPagerResponse<ICompanyDTO> = {
    data: result,
    total: count,
    paginated: count > PER_PAGE,
    pages: Math.floor(count / PER_PAGE),
  };

  return pagerResult;
}
