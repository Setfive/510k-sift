import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {IDeviceDTO, IDeviceSSEEvent, IProductCodeDTO, IProgressSSEEvent} from "../service/types";
import {ApiService} from "../service/api.service";

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {

  loading = true;
  device?: IDeviceDTO;
  productCodeDto?: IProductCodeDTO;
  progressMessage = '';
  progressMessages: string[] = [];
  loadingMarketingAudience = false;

  public constructor(private activatedRoute: ActivatedRoute, private apiService: ApiService,) {
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
    this.progressMessage = 'Getting marketing audience from ChatGPT...';
    this.loadingMarketingAudience = true;

    this.apiService.generateMarketingAudience(`${this.device?.knumber}`).subscribe(result => {
      if(this.device) {
        this.device.deviceMarketingAudience = result.deviceMarketingAudience;
        this.progressMessage = '';
      }
      this.loadingMarketingAudience = false;
    });
  }

  async extractIFU() {
    const response = await fetch(`http://localhost:8080/api/enhance/ifu/${this.device?.knumber}`, {
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
          this.progressMessage = '';
        } else if (event.type === 'progress') {
          this.progressMessages.push(event.data);
          this.progressMessage = event.data;
        }

        // this.popProgressMessage();
        // setTimeout(() => this.popProgressMessage(), 2000);
      }
    }
  }

  popProgressMessage() {
    if(this.progressMessages.length) {
      this.progressMessage = `${this.progressMessages.shift()}`;
    }else{
      this.progressMessage = '';
    }
  }
}
