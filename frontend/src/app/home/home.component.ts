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

    this.apiService.search(request).subscribe(result => {
      this.result = result;
    });
  }
}
