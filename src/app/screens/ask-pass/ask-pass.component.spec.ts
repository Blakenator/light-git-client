import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {AskPassComponent} from './ask-pass.component';

describe('AskPassComponent', () => {
  let component: AskPassComponent;
  let fixture: ComponentFixture<AskPassComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AskPassComponent],
    })
           .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AskPassComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
