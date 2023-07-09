export interface ISearchRequest {
  knumber?: string;
  applicant?: string;
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
  productCode: string;
  statementOrSummary: string;
  type: string;
  summaryStatementURL: string;
  indicationsForUse?: string;
  deviceMarketingAudience?: string;
  relatedKNumbers?: string[];
}
