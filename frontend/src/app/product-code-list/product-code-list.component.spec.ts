import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCodeListComponent } from './product-code-list.component';

describe('ProductCodeListComponent', () => {
  let component: ProductCodeListComponent;
  let fixture: ComponentFixture<ProductCodeListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProductCodeListComponent]
    });
    fixture = TestBed.createComponent(ProductCodeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
