import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AgeInfoComponent } from './age-info.component';

describe('AgeInfoComponent', () => {
  let component: AgeInfoComponent;
  let fixture: ComponentFixture<AgeInfoComponent>;

  beforeEach(waitForAsync(() => {
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
