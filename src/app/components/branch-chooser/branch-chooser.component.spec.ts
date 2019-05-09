import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {BranchChooserComponent} from './branch-chooser.component';

describe('BranchChooserComponent', () => {
  let component: BranchChooserComponent;
  let fixture: ComponentFixture<BranchChooserComponent>;

  beforeEach(async(() => {
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
