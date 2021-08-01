import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { RestoreStashComponent } from './restore-stash.component';

describe('RestoreStashComponent', () => {
  let component: RestoreStashComponent;
  let fixture: ComponentFixture<RestoreStashComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RestoreStashComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestoreStashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
