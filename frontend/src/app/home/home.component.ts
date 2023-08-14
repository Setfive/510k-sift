import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {
  IDeviceDTO,
  IDeviceSSEEvent,
  IPagerResponse,
  IProgressSSEEvent,
  ISearchRequest,
  ISearchResultsSSEEvent
} from "../service/types";
import {ApiService} from "../service/api.service";
import {DECISIONS} from "./decisions";
import {ToastService} from "../service/toast.service";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {SampleSearchKeys} from "./types";

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
  hasSearch = false;
  page = 1;
  pages: number[] = [];
  protected readonly DECISIONS = DECISIONS;

  @ViewChild("deviceNameContent")
  deviceNameContent?: TemplateRef<string>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private toastService: ToastService,
    private modalService: NgbModal
  ) {
    this.form = this.formBuilder.group({
      deviceName: [],
      kNumber: [],
      company: [],
      decision: [],
      decisionDateGte: [],
      decisionDateLte: [],
      produceCodes: []
    });
  }

  ngOnInit() {

  }

  sampleSearch(key: SampleSearchKeys) {
    if(key === 'stryker') {
      this.form.get('company')?.setValue('Stryker');
      this.form.get('decisionDateGte')?.setValue('2015-01-01');
    }else if(key === 'bone') {
      this.form.get('deviceName')?.setValue('bone cement');
    }else if(key === 'sseSome') {
      this.form.get('decision')?.setValue('SN');
    }
    this.submit();
  }

  showDeviceNameModal() {
    this.modalService.open(this.deviceNameContent, {size: "lg"});
  }

  async submit() {
    this.hasSearch = true;

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

    if(this.form.value.decision) {
      request.decision = this.form.value.decision;
    }

    this.loading = true;
    this.noResults = false;
    request.page = this.page;

    this.result = await this.apiService.search(request);
    this.toastService.progressMessage = '';
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
  }

  go(val: number) {
    window.scrollTo(0, 0);
    this.page = val;
    this.submit();
  }
}
