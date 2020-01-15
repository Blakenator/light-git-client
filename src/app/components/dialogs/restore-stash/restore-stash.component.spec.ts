import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestoreStashComponent } from './restore-stash.component';

describe('RestoreStashComponent', () => {
  let component: RestoreStashComponent;
  let fixture: ComponentFixture<RestoreStashComponent>;

  beforeEach(async(() => {
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
