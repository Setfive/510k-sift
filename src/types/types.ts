export interface ICommandLineArgs {
  command:
    | "createdb"
    | "convertPdfToJson"
    | "createBashConverts"
    | "getDownloadUrls"
    | "download";
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