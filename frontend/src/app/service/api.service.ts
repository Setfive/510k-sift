import {Injectable} from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import {
  ICompanyDTO,
  ICompanySearchRequest,
  IDeviceDTO, IDeviceSSEEvent,
  IPagerResponse,
  IProductCodeDTO,
  IProductCodeDTOWithDevices,
  IProductCodeSearchRequest, IProgressSSEEvent,
  ISearchRequest, ISearchResultsSSEEvent
} from "./types";
import {ToastService} from "./toast.service";

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private httpClient: HttpClient, private toastService: ToastService) {}

  public extractIFU(knumber: string) {
    return new Promise<string>(async (resolve, reject) => {
      const response = await fetch(`/api/enhance/ifu/${knumber}`, {
        method: "POST",
        headers: {
          "Accept": "text/event-stream",
          "Content-Type": "application/json"
        },
      });

      for (const reader= response.body?.getReader();;) {
        if (!reader) {
          break;
        }
        const {value, done} = await reader.read();
        if (done) {
          break;
        }
        const chunks = new TextDecoder().decode(value).trim().split('\n');

        for (const chunk of chunks) {
          if (chunk.trim().length === 0) {
            continue;
          }
          const event: IDeviceSSEEvent | IProgressSSEEvent = JSON.parse(chunk.trim());
          if (event.type === 'device') {
            this.toastService.progressMessage = '';
            resolve(`${event.data.indicationsForUseAI}`);
          } else if (event.type === 'progress') {
            this.toastService.progressMessages.push(event.data);
            this.toastService.progressMessage = event.data;
          }
        }
      }
    });
  }

  public search(request: ISearchRequest) {
    return new Promise<IPagerResponse<IDeviceDTO>>(async (resolve, reject) => {
      const response = await fetch(`/api/search`, {
        method: "POST",
        body: JSON.stringify(request),
        headers: {
          "Accept": "text/event-stream",
          "Content-Type": "application/json"
        },
      });

      for (const reader= response.body?.getReader();;) {
        if (!reader) {
          break;
        }
        const {value, done} = await reader.read();
        if (done) {
          break;
        }
        const chunks = new TextDecoder().decode(value).trim().split('\n');

        for (const chunk of chunks) {
          if (chunk.trim().length === 0) {
            continue;
          }

          const event: ISearchResultsSSEEvent | IProgressSSEEvent = JSON.parse(chunk.trim());
          if (event.type === 'results') {
            const id = event.data;
            this.httpClient.get<IPagerResponse<IDeviceDTO>>(`/api/search/${id}`)
              .subscribe((searchResults) => {
              resolve(searchResults);
            });
          } else if (event.type === 'progress') {
            this.toastService.progressMessages.push(event.data);
            this.toastService.progressMessage = event.data;
          }
        }
      }
    })
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

  public async getProductCodeMedicalSpecialities() {
    return new Promise<string[]>((resolve, reject) => {
      this.httpClient.get<string[]>(`/api/search/product-codes/specialities`).subscribe(resolve);
    });
  }

  public async getProductCodeReviewPanels() {
    return new Promise<string[]>((resolve, reject) => {
      this.httpClient.get<string[]>(`/api/search/product-codes/panels`).subscribe(resolve);
    });
  }

  public getProductCode(code: string) {
    return this.httpClient.get<IProductCodeDTOWithDevices>(`/api/search/product-codes/${code}`);
  }

  public getProductCodeWithAIDescription(code: string) {
    return this.httpClient.post<IProductCodeDTOWithDevices>(`/api/search/product-codes/${code}/description`, {});
  }

  public searchCompanies(request: ICompanySearchRequest) {
    return this.httpClient.post<IPagerResponse<ICompanyDTO>>(`/api/search/companies`, request);
  }

  public getCompany(id: string) {
    return this.httpClient.get<ICompanyDTO>(`/api/search/companies/${id}`);
  }
}
