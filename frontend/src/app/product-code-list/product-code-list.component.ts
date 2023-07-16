import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {ApiService} from "../service/api.service";
import {IDeviceDTO, IPagerResponse, IProductCodeDTO, IProductCodeSearchRequest, ISearchRequest} from "../service/types";

@Component({
  selector: 'app-product-code-list',
  templateUrl: './product-code-list.component.html',
  styleUrls: ['./product-code-list.component.scss']
})
export class ProductCodeListComponent implements OnInit {
  form: FormGroup;
  result?: IPagerResponse<IProductCodeDTO>;
  loading = false;
  noResults = false;
  page = 1;
  pages: number[] = [];

  public constructor(private formBuilder: FormBuilder,
                     private apiService: ApiService) {
    this.form = this.formBuilder.group({
      productCode: [],
      reviewPanel: [],
      medicalSpeciality: [],
      deviceName: [],
    });
  }

  ngOnInit() {
    this.submit();
  }

  async submit() {
    const request: IProductCodeSearchRequest = {};

    this.loading = true;
    this.noResults = false;
    request.page = this.page;
    this.apiService.searchProductCodes(request).subscribe(result => {
      this.result = result;
      this.loading = false;
      if(this.result.total === 0) {
        this.noResults = true;
      }
      const min = this.page - 5 > 0 ? this.page - 5 : 0;
      const max = this.page + 5 < this.result.pages ? this.page + 5 : this.result.pages;
      this.pages = [];
      for(let i = min; i < max; i++) {
        this.pages.push(i + 1);
      }
    });
  }

  go(val: number) {
    window.scrollTo(0, 0);
    this.page = val;
    this.submit();
  }
}
