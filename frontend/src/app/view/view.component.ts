import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {IDeviceDTO, IDeviceSSEEvent, IProductCodeDTO, IProgressSSEEvent} from "../service/types";
import {ApiService} from "../service/api.service";
import {ToastService} from "../service/toast.service";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";

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
  @ViewChild("aiSimilarDevicesModalContent")
  aiSimilarDevicesModalContent?: TemplateRef<string>;
  @ViewChild("aiMarketAudienceModalContent")
  aiMarketAudienceModalContent?: TemplateRef<string>;
  @ViewChild("aiIndicationsForUseModalContent")
  aiIndicationsForUseModalContent?: TemplateRef<string>;

  public constructor(private activatedRoute: ActivatedRoute,
                     private apiService: ApiService,
                     private toastService: ToastService,
                     private modalService: NgbModal) {
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

  showSimilarDevicesModal() {
    this.modalService.open(this.aiSimilarDevicesModalContent, {size: "lg"});
  }

  showMarketingAudienceModal() {
    this.modalService.open(this.aiMarketAudienceModalContent, {size: "lg"});
  }

  showIndicationsForUseModal() {
    this.modalService.open(this.aiIndicationsForUseModalContent, {size: "lg"});
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
    if(!this.device) {
      return;
    }
    this.device.indicationsForUseAI = await this.apiService.extractIFU(this.device.knumber);
  }

  nl2br(value?: string) {
    if(!value) {
      return value;
    }

    return value.replace(/\n/g, '<br/>');
  }
}
