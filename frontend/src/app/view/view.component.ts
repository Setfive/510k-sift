import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {IDeviceDTO, IDeviceSSEEvent, IProductCodeDTO, IProgressSSEEvent} from "../service/types";
import {ApiService} from "../service/api.service";
import {ToastService} from "../service/toast.service";

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {

  loading = true;
  device?: IDeviceDTO;
  productCodeDto?: IProductCodeDTO;
  loadingMarketingAudience = false;

  public constructor(private activatedRoute: ActivatedRoute,
                     private apiService: ApiService,
                     private toastService: ToastService) {
  }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe(paramMap => {
      const knumber = `${paramMap.get('knumber')}`;
      this.apiService.getDevice(knumber).subscribe(result => {
        this.loading = false;
        this.device = result;
        if(this.device.productCodeDto) {
          this.productCodeDto = this.device.productCodeDto;
        }
      });
    });
  }

  async getMarketingAudience() {
    this.toastService.progressMessage = 'Getting marketing audience from ChatGPT...';
    this.loadingMarketingAudience = true;

    this.apiService.generateMarketingAudience(`${this.device?.knumber}`).subscribe(result => {
      if(this.device) {
        this.device.deviceMarketingAudience = result.deviceMarketingAudience;
        this.toastService.progressMessage = '';
      }
      this.loadingMarketingAudience = false;
    });
  }

  async extractIFU() {
    const response = await fetch(`/api/enhance/ifu/${this.device?.knumber}`, {
      headers: {
        "Accept": "text/event-stream",
      },
    });

    for (const reader= response.body?.getReader();;) {
      if(!reader) {
        break;
      }
      const {value, done} = await reader.read();
      if (done) {
        break;
      }
      const chunks = new TextDecoder().decode(value).trim().split('\n');

      for(const chunk of chunks) {
        if(chunk.trim().length === 0) {
          continue;
        }

        const event: IDeviceSSEEvent | IProgressSSEEvent = JSON.parse(chunk);
        if (event.type === 'device' && this.device) {
          this.device.indicationsForUseAI = event.data.indicationsForUseAI;
          this.toastService.progressMessage = '';
        } else if (event.type === 'progress') {
          this.toastService.progressMessages.push(event.data);
          this.toastService.progressMessage = event.data;
        }
      }
    }

  }

  popProgressMessage() {
    if(this.toastService.progressMessages.length) {
      this.toastService.progressMessage = `${this.toastService.progressMessages.shift()}`;
    }else{
      this.toastService.progressMessage = '';
    }
  }
}
