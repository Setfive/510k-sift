import { Device } from "../entity/device";

export interface ICommandLineArgs {
  command:
    | "createdb"
    | "convertPdfToJson"
    | "createBashConverts"
    | "getDownloadUrls"
    | "download"
    | "calculateTokens"
    | "extractIFUForm3881"
    | "extractIFUEmbeddings"
    | "extractRelatedKNumbers"
    | "downloadProductCodes"
    | "dumpToJson"
    | "importFromJson"
    | "createDeviceNameEmbeddings"
    | "createDeviceEmbeddingBash"
    | "generateSimilarDeviceNames"
    | "createGenerateSimilarDeviceNamesBash"
    | "createVectorDB";
}

export interface ICommandLineArgsExtract extends ICommandLineArgs {
  id: string;
}

export interface ICSVEntry {
  KNUMBER: string;
  APPLICANT: string;
  CONTACT: string;
  STREET1: string;
  STREET2: string;
  CITY: string;
  STATE: string;
  COUNTRY_CODE: string;
  ZIP: string;
  POSTAL_CODE: string;
  DATERECEIVED: string;
  DECISIONDATE: string;
  DECISION: string;
  REVIEWADVISECOMM: string;
  PRODUCTCODE: string;
  STATEORSUMM: string;
  CLASSADVISECOMM: string;
  SSPINDICATOR: string;
  TYPE: string;
  THIRDPARTY: string;
  EXPEDITEDREVIEW: string;
  DEVICENAME: string;
}

export interface IDeviceJson extends Device {
  statementText: string;
  foiaText: string;
}

export interface ICSVProductCodeEntry {
  REVIEW_PANEL: string;
  MEDICALSPECIALTY: string;
  PRODUCTCODE: string;
  DEVICENAME: string;
  DEVICECLASS: string;
  UNCLASSIFIED_REASON: string;
  GMPEXEMPTFLAG: string;
  THIRDPARTYFLAG: string;
  REVIEWCODE: string;
  REGULATIONNUMBER: string;
  SUBMISSION_TYPE_ID: string;
  DEFINITION: string;
  PHYSICALSTATE: string;
  TECHNICALMETHOD: string;
  TARGETAREA: string;
  Implant_Flag: string;
  Life_Sustain_support_flag: string;
  SummaryMalfunctionReporting: string;
}

export interface ISemanticSearchRequest {
  search: string;
}

export interface ISearchRequest {
  knumber?: string;
  applicant?: string;
  decisionDateGte?: string;
  decisionDateLte?: string;
  productCodes?: string[];
  deviceName?: string;
  page: number;
}

export interface IPagerResponse<T> {
  data: T[];
  total: number;
  paginated: boolean;
  pages: number;
}

export interface IProductCodeSearchRequest {
  productCode: string;
  reviewPanel: string;
  medicalSpeciality: string;
  deviceName: string;
  page: number;
}

export interface ICompanySearchRequest {
  name: string;
  page: number;
}

export type RelatedDeviceType = "similar_device_name" | "referenced_knumber";
