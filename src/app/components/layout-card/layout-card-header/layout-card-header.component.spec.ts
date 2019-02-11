import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutCardHeaderComponent } from './layout-card-header.component';

describe('LayoutCardHeaderComponent', () => {
  let component: LayoutCardHeaderComponent;
  let fixture: ComponentFixture<LayoutCardHeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LayoutCardHeaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutCardHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
