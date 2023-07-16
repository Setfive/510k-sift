import {Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = '510(k) Sift';
  activeNav = 'home';
  public constructor(
    private router: Router,
  ) {}

  isActive(path: string) {
    if (path === 'home' && this.router.url === '/') {
      return true;
    }
    return this.router.url.includes(path);
  }
}
