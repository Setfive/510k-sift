export interface ISearchRequest {
  knumber?: string;
  applicant?: string;
  decision?: string;
  decisionDateGte?: string;
  decisionDateLte?: string;
  productCodes?: string[];
  deviceName?: string;
  page?: number;
}

export interface IPagerResponse<T> {
  data: T[];
  total: number;
  paginated: boolean;
  pages: number;
}

export interface IDeviceDTO {
  knumber: string;
  deviceName: string;
  applicant: string;
  contact: string;
  address: string;
  dateReceived: Date;
  decisionDate: Date;
  decision: string;
  decisionLabel: string;
  productCode: string;
  statementOrSummary: string;
  type: string;
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

export interface ICompanyDTO {
  id: number;
  slug: string;
  name: string;
  cnt: number;
}

export interface IDeviceSSEEvent {
  type: 'device';
  data: IDeviceDTO;
}

export interface IProgressSSEEvent {
  type: 'progress';
  data: string;
}

export interface ISearchResultsSSEEvent {
  type: 'results';
  data: string;
}

export interface IProductCodeSearchRequest {
  productCode?: string;
  reviewPanel?: string;
  medicalSpeciality?: string;
  deviceName?: string;
  page?: number;
}

export interface IProductCodeDTOWithDevices extends IProductCodeDTO {
  devices: IDeviceDTO[];
}

export interface ICompanySearchRequest {
  name?: string;
  page?: number;
}

export interface IPromptDTO {
  system: string;
  user: string;
}
