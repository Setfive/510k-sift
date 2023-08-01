import { Device } from "../entity/device";

export interface IDeviceDTO {
  knumber: string;
  deviceName: string;
  applicant: string;
  contact: string;
  address: string;
  dateReceived: string;
  decisionDate: string;
  decision: Decision;
  decisionLabel: string;
  productCode: string;
  statementOrSummary: StatementOrSummary;
  type: SubmissionType;
  summaryStatementURL: string;
  indicationsForUse?: string;
  deviceMarketingAudience?: string;
  relatedKNumbers?: string[];
  productCodeDto?: IProductCodeDTO;
  indicationsForUseAI?: string;
  marketingAudiencePrompt?: IPromptDTO;
  similarDevices: IDeviceDTO[];
}

export interface IProductCodeDTO {
  productCode: string;
  reviewPanel: string;
  medicalSpeciality: string;
  deviceName: string;
  deviceClass: string;
  regulationNumber: string;
  aiDescription: string;
  prompt?: IPromptDTO;
}

export interface IProductCodeDTOWithDevices extends IProductCodeDTO {
  devices: IDeviceDTO[];
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

export interface ICompanyDTO {
  name: string;
  cnt: number;
}

export interface IPromptDTO {
  system: string;
  user: string;
}
