import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MergeBranchDropdownComponent } from './merge-branch-dropdown.component';

describe('MergeBranchDropdownComponent', () => {
  let component: MergeBranchDropdownComponent;
  let fixture: ComponentFixture<MergeBranchDropdownComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MergeBranchDropdownComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MergeBranchDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
