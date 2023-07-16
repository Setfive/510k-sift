import {Injectable} from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import {IDeviceDTO, IPagerResponse, IProductCodeDTO, IProductCodeSearchRequest, ISearchRequest} from "./types";

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private httpClient: HttpClient) {}

  public search(request: ISearchRequest) {
    return this.httpClient.post<IPagerResponse<IDeviceDTO>>(`/api/search`, request);
  }

  public getDevice(knumber: string) {
    return this.httpClient.get<IDeviceDTO>(`/api/get/${knumber}`);
  }

  public generateMarketingAudience(knumber: string) {
    return this.httpClient.post<IDeviceDTO>(`/api/enhance/marketing/${knumber}`, {});
  }

  public searchProductCodes(request: IProductCodeSearchRequest) {
    return this.httpClient.post<IPagerResponse<IProductCodeDTO>>(`/api/search/product-codes`, request);
  }
}
