import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {PruneBranchComponent} from './prune-branch.component';

describe('PruneBranchComponent', () => {
  let component: PruneBranchComponent;
  let fixture: ComponentFixture<PruneBranchComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PruneBranchComponent],
    })
           .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PruneBranchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
