import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AgeInfoComponent } from './age-info.component';

describe('AgeInfoComponent', () => {
  let component: AgeInfoComponent;
  let fixture: ComponentFixture<AgeInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AgeInfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AgeInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
