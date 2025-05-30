import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandHistoryComponent } from './command-history.component';

describe('CommandHistoryComponent', () => {
  let component: CommandHistoryComponent;
  let fixture: ComponentFixture<CommandHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommandHistoryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommandHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
