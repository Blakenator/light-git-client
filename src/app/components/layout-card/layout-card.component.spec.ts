import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutCardComponent } from './layout-card.component';

describe('LayoutCardComponent', () => {
  let component: LayoutCardComponent;
  let fixture: ComponentFixture<LayoutCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LayoutCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
