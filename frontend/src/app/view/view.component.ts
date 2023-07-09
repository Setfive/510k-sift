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

  public constructor(private activatedRoute: ActivatedRoute, private apiService: ApiService,) {
  }

  ngOnInit() {
    const knumber = `${this.activatedRoute.snapshot.paramMap.get('knumber')}`;
    this.apiService.getDevice(knumber).subscribe(result => {
      this.loading = false;
      this.device = result;
      if(this.device.productCodeDto) {
        this.productCodeDto = this.device.productCodeDto;
      }
    });
  }

  async extractIFU() {
    const response = await fetch(`http://localhost:8080/api/enhance/ifu/${this.device?.knumber}`, {
      headers: {
        "Accept": "text/event-stream",
      },
    });

    for (const reader = response.body?.getReader();;) {
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
          setTimeout(() => this.progressMessage = '', 2000);
        } else if (event.type === 'progress') {
          this.progressMessages.push(event.data);
        }

        this.popProgressMessage();
      }

    }
  }

  popProgressMessage() {
    if(this.progressMessages.length) {
      this.progressMessage = `${this.progressMessages.shift()}`;
      setTimeout(() => this.popProgressMessage(), 1000);
    }
  }
}
