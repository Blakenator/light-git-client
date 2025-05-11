import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveJobsComponent } from './active-jobs.component';

describe('ActiveJobsComponent', () => {
  let component: ActiveJobsComponent;
  let fixture: ComponentFixture<ActiveJobsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActiveJobsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveJobsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
