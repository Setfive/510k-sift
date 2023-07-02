import { appDataSource } from "../db";
import { Device } from "../entity/device";
import {
  Decision,
  IDeviceDTO,
  StatementOrSummary,
  SubmissionType,
} from "./types";

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
    indicationsForUse: device.indicationsForUse,
  };
  return item;
}
