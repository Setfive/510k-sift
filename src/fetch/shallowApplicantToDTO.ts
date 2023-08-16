import { Applicant } from "../entity/applicant";
import { IApplicantDTO } from "./types";

export async function shallowApplicantToDTO(
  applicant: Applicant
): Promise<IApplicantDTO> {
  const addressParts: string[] = [
    applicant.street1,
    applicant.street2,
    `${applicant.city},`,
    applicant.state,
    applicant.postal_code,
    applicant.country_code,
  ];
  const address = addressParts.filter((item) => item?.trim().length).join(" ");
  const slug = applicant.applicant.replace(/\W+/g, "-");
  return {
    id: applicant.id,
    slug: slug,
    name: applicant.applicant,
    contact: applicant.contact,
    address: address,
  };
}
