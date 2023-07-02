import { Device } from "../entity/device";

export interface IDeviceDTO {
  knumber: string;
  deviceName: string;
  applicant: string;
  contact: string;
  address: string;
  dateReceived: Date;
  decisionDate: Date;
  decision: Decision;
  productCode: string;
  statementOrSummary: StatementOrSummary;
  type: SubmissionType;
  summaryStatementURL: string;
  indicationsForUse: string;
}

export type StatementOrSummary = "Summary" | "Statement";

export type SubmissionType =
  | "Post-NSE"
  | "Traditional"
  | "Abbreviated"
  | "Special"
  | "Direct"
  | "Dual Track";

export type Decision =
  | "DENG"
  | "PT"
  | "SEKD"
  | "SESD"
  | "SESE"
  | "SESK"
  | "SESP"
  | "SESU"
  | "SI"
  | "SN"
  | "ST";

export interface IDeviceDotResult {
  data: number;
  device: Device;
}

export interface IDeviceDTODotResult {
  data: number;
  device: IDeviceDTO;
}
