import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {ApiService} from "../service/api.service";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {ICompanyDTO} from "../service/types";

@Component({
  selector: 'app-company-detail',
  templateUrl: './company-detail.component.html',
  styleUrls: ['./company-detail.component.scss']
})
export class CompanyDetailComponent implements OnInit {
  company?: ICompanyDTO;

  public constructor(private activatedRoute: ActivatedRoute,
                     private apiService: ApiService,
                     private modalService: NgbModal) {

  }

  async ngOnInit() {
    this.activatedRoute.paramMap.subscribe(paramMap => {
      const id = `${paramMap.get('id')}`;
      this.apiService
          .getCompany(id)
          .subscribe(result => this.company = result);
    });
  }
}
