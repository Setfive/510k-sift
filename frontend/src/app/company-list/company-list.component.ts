import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {
  ICompanyDTO,
  ICompanySearchRequest,
  IPagerResponse,
} from "../service/types";
import {ApiService} from "../service/api.service";

@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss']
})
export class CompanyListComponent implements OnInit {
  form: FormGroup;
  result?: IPagerResponse<ICompanyDTO>;
  loading = false;
  noResults = false;
  page = 1;
  pages: number[] = [];

  public constructor(private formBuilder: FormBuilder,
                     private apiService: ApiService) {
    this.form = this.formBuilder.group({
      name: [],
    });
  }

  async ngOnInit() {
    this.submit();
  }

  async submit() {
    const request: ICompanySearchRequest = {};
    if(this.form.value.name) {
      request.name = this.form.value.name;
    }

    this.loading = true;
    this.noResults = false;
    request.page = this.page;
    this.apiService.searchCompanies(request).subscribe(result => {
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
