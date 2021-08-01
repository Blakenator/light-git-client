import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {BranchChooserComponent} from './branch-chooser.component';

describe('BranchChooserComponent', () => {
  let component: BranchChooserComponent;
  let fixture: ComponentFixture<BranchChooserComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BranchChooserComponent],
    })
           .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BranchChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
