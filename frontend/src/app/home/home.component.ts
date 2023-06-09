import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {IDeviceDTO, IPagerResponse, ISearchRequest} from "../service/types";
import {ApiService} from "../service/api.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  form: FormGroup;
  result?: IPagerResponse<IDeviceDTO>;
  loading = false;
  noResults = false;
  page = 1;
  pages: number[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
  ) {
    this.form = this.formBuilder.group({
      deviceName: [],
      kNumber: [],
      company: [],
      decisionDateGte: [],
      decisionDateLte: [],
      produceCodes: []
    });
  }

  ngOnInit() {

  }

  async submit() {
    const request:ISearchRequest = {};

    if(this.form.value.deviceName) {
      request.deviceName = this.form.value.deviceName;
    }

    if(this.form.value.company) {
      request.applicant = this.form.value.company;
    }

    if(this.form.value.knumber) {
      request.knumber = this.form.value.knumber;
    }

    if(this.form.value.decisionDateGte) {
      request.decisionDateGte = this.form.value.decisionDateGte;
    }

    if(this.form.value.decisionDateLte) {
      request.decisionDateLte = this.form.value.decisionDateLte;
    }

    if(this.form.value.produceCodes) {
      request.productCodes = `${this.form.value.produceCodes}`.split(',').map(item => item.trim());
    }

    this.loading = true;
    this.noResults = false;
    request.page = this.page;
    this.apiService.search(request).subscribe(result => {
      this.result = result;
      this.loading = false;
      if(this.result.total === 0) {
        this.noResults = true;
      }
      this.pages = [];
      for(let i = 0; i < this.result.pages; i++) {
        this.pages.push(i + 1);
      }
    });
  }

  go(val: number) {
    this.page = val;
    this.submit();
  }
}
