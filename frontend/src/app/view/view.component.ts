import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {IDeviceDTO, IProductCodeDTO} from "../service/types";
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

    for (const reader = response.body?.getReader();; ) {
      if(!reader) {
        break;
      }
      const {value, done} = await reader.read();
      if (done) {
        break;
      }
      const chunk = new TextDecoder().decode(value).trim();
      console.log(chunk);
    }
  }
}
