import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/git/CommitSummary.model';
import {FilterPipe} from '../../common/pipes/filter.pipe';

@Component({
  selector: 'app-commit-history',
  templateUrl: './commit-history.component.html',
  styleUrls: ['./commit-history.component.scss'],
})
export class CommitHistoryComponent implements OnInit {
  @Input() commitHistory: CommitSummaryModel[];
  @Output() onClickCommitDiff = new EventEmitter<CommitSummaryModel>();
  @Output() onScrollDown = new EventEmitter<any>();
  @Output() onClickCherryPick = new EventEmitter<CommitSummaryModel>();
  @Output() onClickCheckout = new EventEmitter<CommitSummaryModel>();
  lastIndex: number;
  lastChunkIndex = 0;
  scrollOffset = 0;
  numPerPage = 50;
  commitFilter: string;

  constructor() {
  }

  ngOnInit() {
  }

  getCommitDiff(commit: CommitSummaryModel) {
    this.onClickCommitDiff.emit(commit);
  }

  scrolled(currentIndex: number) {
    if (currentIndex > this.lastIndex && Math.floor(currentIndex / this.numPerPage * 4) > this.lastChunkIndex) {
      this.scrollOffset += this.numPerPage / 4;
      this.scrollOffset = Math.round(Math.max(
        0,
        Math.min(this.scrollOffset, this.commitHistory.length - this.numPerPage)));
      this.onScrollDown.emit();
      this.lastChunkIndex = Math.floor(currentIndex / this.numPerPage * 4);
    }
    this.lastIndex = currentIndex;
  }

  getFilteredCommitHistory() {
    if (!this.commitFilter) {
      return this.commitHistory.slice(0, this.scrollOffset + this.numPerPage);
    } else {
      return this.commitHistory.filter(c => {
        const needle = this.commitFilter.toLowerCase();
        return FilterPipe.fuzzyFilter(needle, c.message.toLowerCase()) ||
          FilterPipe.fuzzyFilter(needle, c.authorName.toLowerCase()) ||
          FilterPipe.fuzzyFilter(needle, c.authorEmail.toLowerCase()) ||
          FilterPipe.fuzzyFilter(needle, c.authorDate.toString().toLowerCase()) ||
          c.hash.indexOf(needle) >= 0;
      });
    }
  }

  cherryPickCommit(commit: CommitSummaryModel) {
    this.onClickCherryPick.emit(commit);
  }

  checkout(commit: CommitSummaryModel) {
    this.onClickCheckout.emit(commit);
  }

  getTagClasses(tag: string) {
    return {
      'badge-info': !tag.startsWith('tag: ') && !tag.startsWith('origin/') && !tag.startsWith('HEAD'),
      'badge-warning': tag.startsWith('tag: '),
      'badge-primary': tag.startsWith('origin/'),
      'badge-success': tag.startsWith('HEAD'),
    };
  }

  getSplitCommitMessage(commit: CommitSummaryModel) {
    return commit.message.split(/\r?\n/g);
  }
}
