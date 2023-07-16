import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCodeDetailComponent } from './product-code-detail.component';

describe('ProductCodeDetailComponent', () => {
  let component: ProductCodeDetailComponent;
  let fixture: ComponentFixture<ProductCodeDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProductCodeDetailComponent]
    });
    fixture = TestBed.createComponent(ProductCodeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
