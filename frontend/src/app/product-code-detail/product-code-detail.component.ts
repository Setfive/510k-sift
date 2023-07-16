import {Component, OnInit} from '@angular/core';
import {IProductCodeDTO, IProductCodeDTOWithDevices} from "../service/types";
import {FormBuilder} from "@angular/forms";
import {ApiService} from "../service/api.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-product-code-detail',
  templateUrl: './product-code-detail.component.html',
  styleUrls: ['./product-code-detail.component.scss']
})
export class ProductCodeDetailComponent implements OnInit {
  loading = false;
  productCode?: IProductCodeDTOWithDevices;
  loadingAIDescription = false;

  public constructor(private activatedRoute: ActivatedRoute,
                     private apiService: ApiService) {

  }

  async ngOnInit() {
    this.activatedRoute.paramMap.subscribe(paramMap => {
      const code = `${paramMap.get('code')}`;
      this.apiService.getProductCode(code).subscribe(result => this.productCode = result);
    });
  }

  getAIDescription() {

  }
}
