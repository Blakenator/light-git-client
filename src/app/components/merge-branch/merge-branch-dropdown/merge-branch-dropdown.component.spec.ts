import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MergeBranchDropdownComponent } from './merge-branch-dropdown.component';

describe('MergeBranchDropdownComponent', () => {
  let component: MergeBranchDropdownComponent;
  let fixture: ComponentFixture<MergeBranchDropdownComponent>;

  beforeEach(async(() => {
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
