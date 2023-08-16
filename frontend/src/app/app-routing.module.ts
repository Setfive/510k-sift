import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import {ViewComponent} from "./view/view.component";
import {ProductCodeListComponent} from "./product-code-list/product-code-list.component";
import {ProductCodeDetailComponent} from "./product-code-detail/product-code-detail.component";
import {CompanyListComponent} from "./company-list/company-list.component";
import {CompanyDetailComponent} from "./company-detail/company-detail.component";
import {AboutComponent} from "./about/about.component";

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'view/:knumber', component: ViewComponent },
  { path: 'product-codes', component: ProductCodeListComponent },
  { path: 'product-codes/:code', component: ProductCodeDetailComponent },
  { path: 'companies', component: CompanyListComponent },
  { path: 'companies/:id/:slug', component: CompanyDetailComponent },
  { path: 'about', component: AboutComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
