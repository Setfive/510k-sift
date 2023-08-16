import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {IProductCodeDTO, IProductCodeDTOWithDevices} from "../service/types";
import {FormBuilder} from "@angular/forms";
import {ApiService} from "../service/api.service";
import {ActivatedRoute} from "@angular/router";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'app-product-code-detail',
  templateUrl: './product-code-detail.component.html',
  styleUrls: ['./product-code-detail.component.scss']
})
export class ProductCodeDetailComponent implements OnInit {
  loading = false;
  productCode?: IProductCodeDTOWithDevices;
  loadingAIDescription = false;
  @ViewChild("aiDescriptionModalContent")
  aiDescriptionModalContent?: TemplateRef<string>;

  public constructor(private activatedRoute: ActivatedRoute,
                     private apiService: ApiService,
                     private modalService: NgbModal) {

  }

  async ngOnInit() {
    this.activatedRoute.paramMap.subscribe(paramMap => {
      const code = `${paramMap.get('code')}`;
      this.apiService.getProductCode(code).subscribe(result => this.productCode = result);
    });
  }

  showDescriptionModal() {
    this.modalService.open(this.aiDescriptionModalContent, {size: "lg"});
  }

  getAIDescription() {
    this.loadingAIDescription = true;
    this.apiService
        .getProductCodeWithAIDescription(`${this.productCode?.productCode}`)
        .subscribe(result => {
          this.loadingAIDescription = false;
          this.productCode = result;
        });
  }

  nl2br(value?: string) {
    return this.apiService.nl2br(value);
  }
}
