import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {PrettyCheckboxComponent} from './pretty-checkbox.component';

describe('PrettyCheckboxComponent', () => {
  let component: PrettyCheckboxComponent;
  let fixture: ComponentFixture<PrettyCheckboxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PrettyCheckboxComponent],
    })
           .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrettyCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
