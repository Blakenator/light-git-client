import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StashModel } from '../../../../shared/git/stash.model';

@Component({
  selector: 'app-stash-list',
  templateUrl: './stash-list.component.html',
  styleUrl: './stash-list.component.scss',
  standalone: false,
})
export class StashListComponent {
  @Input() public stashes: StashModel[];
  @Input() public stashFilter: string;
  @Output() public onViewStash: EventEmitter<StashModel> =
    new EventEmitter<StashModel>();
  @Output() public onApplyStash: EventEmitter<StashModel> =
    new EventEmitter<StashModel>();
  @Output() public onDeleteStash: EventEmitter<StashModel> =
    new EventEmitter<StashModel>();

  getStashFilterText(stash: StashModel) {
    return stash.branchName + stash.message + stash.branchName;
  }
}
