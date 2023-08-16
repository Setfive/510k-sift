import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
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
  @ViewChild("aiCompanyProfileModalContent")
  aiCompanyProfileModalContent?: TemplateRef<string>;
  loadingAIProfile = false;

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

  showCompanyProfileModal() {
    this.modalService.open(this.aiCompanyProfileModalContent, {size: "lg"});
  }

  public getAIProfile() {
    this.loadingAIProfile = true;
    this.apiService
      .getCompanyWithAIDescription(`${this.company?.id}`)
      .subscribe(result => {
        this.loadingAIProfile = false;
        this.company = result;
      });
  }

  nl2br(value?: string) {
    return this.apiService.nl2br(value);
  }
}
