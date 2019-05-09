import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {GitGraphCanvasComponent} from './git-graph-canvas.component';

describe('GitGraphCanvasComponent', () => {
  let component: GitGraphCanvasComponent;
  let fixture: ComponentFixture<GitGraphCanvasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GitGraphCanvasComponent],
    })
           .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GitGraphCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
