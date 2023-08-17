import { ICompanySearchRequest, IPagerResponse } from "../types/types";
import { appDataSource } from "../db";
import { ProductCode } from "../entity/productCode";
import { PER_PAGE, shallowDeviceToDTO } from "./index";
import { Device } from "../entity/device";
import {
  IApplicantDTO,
  ICompanyDTO,
  IDeviceDTO,
  IProductCodeDTO,
} from "./types";
import { productCodeToDTO } from "./productCodes";
import { Applicant } from "../entity/applicant";
import { shallowApplicantToDTO } from "./shallowApplicantToDTO";
import EventEmitter from "events";
import * as moment from "moment/moment";
import { getOpenAI } from "../openai";
import { LOGGER } from "../logger";
import { nl2br } from "../openai/utility";

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
    sortedBy: "Number of 510(k)s",
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

  const sortedByDate = ([] as IDeviceDTO[]).concat(dto.devices).sort((a, b) => {
    const am = moment(a.decisionDate, "MMMM Do YYYY");
    const bm = moment(b.decisionDate, "MMMM Do YYYY");
    if (am.isBefore(bm)) {
      return 1;
    } else if (am.isAfter(bm)) {
      return -1;
    }
    return 0;
  });

  const shortDevices = sortedByDate
    .slice(0, 3)
    .map((item) => item.deviceName)
    .join("\n");
  const system = `You're an AI being used inside an enterprise medical device data platform.
The data platform contains data from the US FDA about 510(k) devices.
Generate a company profile like one that would be available in Bloomberg for the provided company details.
Use the cleared devices to determine the types of devices the company makes. Don't list the cleared devices in the profile.
In the profile include: 
* a paragraph providing an overview about the company
* a paragraph summarizing the types of devices the company develops
* a paragraph providing a range for the company's number of employees and a range for the company's revenue`;
  const user = `Company Name: ${applicant.applicant}
Headquarters: ${dto.address}
Here are some cleared devices:
${shortDevices}`;

  dto.profilePrompt = {
    system: system,
    user: user,
  };

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

export async function getCompanyWithAIProfile(
  id: string
): Promise<IApplicantDTO> {
  const applicant = await appDataSource
    .getRepository(Applicant)
    .findOneByOrFail({ id: parseInt(id, 10) });
  const dto = await getCompany(id);

  if (!applicant.aiProfile) {
    try {
      const openai = getOpenAI();
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: dto.profilePrompt?.system },
          {
            role: "user",
            content: dto.profilePrompt?.user,
          },
        ],
        max_tokens: 1000,
      });

      const text = `${completion.data.choices[0].message?.content}`.trim();
      applicant.aiProfile = nl2br(text);
      dto.aiProfile = applicant.aiProfile;
      await appDataSource.manager.save(applicant);
    } catch (e) {
      console.error(e);
      LOGGER.error(e);
    }
  }

  return dto;
}
