import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/git/CommitSummary.model';
import {FilterPipe} from '../common/pipes/filter.pipe';

@Component({
  selector: 'app-commit-history',
  templateUrl: './commit-history.component.html',
  styleUrls: ['./commit-history.component.scss'],
})
export class CommitHistoryComponent implements OnInit {
  @Input() commitHistory: CommitSummaryModel[];
  @Output() onClickCommitDiff = new EventEmitter<CommitSummaryModel>();
  @Output() onScrollDown = new EventEmitter<any>();
  scrollOffset = 0;
  numPerPage = 50;
  commitFilter: string;
  getColor = CommitSummaryModel.getCommitBranchColor;

  constructor() {
  }

  ngOnInit() {
  }

  getCommitDiff(commit: CommitSummaryModel) {
    this.onClickCommitDiff.emit(commit);
  }

  scrolled(down: boolean) {
    if (down) {
      this.scrollOffset += this.numPerPage / 4;
    }
    if (!down) {
      this.scrollOffset -= this.numPerPage / 4;
    }
    this.scrollOffset = Math.round(Math.max(
      0,
      Math.min(this.scrollOffset, this.commitHistory.length - this.numPerPage)));
    if (this.scrollOffset >= this.commitHistory.length - this.numPerPage) {
      this.onScrollDown.emit();
    }
  }

  getSpacerList(c: CommitSummaryModel) {
    let res = [];
    c.graphBlockTargets.forEach(x => {
      let isCommit = x.isCommit;
      let isMerge = x.isMerge;
      let branch = x.branchIndex;

      if (res[x.source]) {
        isCommit = isCommit || res[x.source].isCommit;
        isMerge = isMerge || res[x.source].isMerge;
        branch = res[x.source].branchIndex;
      }

      res[x.source] = Object.assign({}, x);
      res[x.source].isCommit = isCommit;
      res[x.source].isMerge = isMerge;
      res[x.source].branchIndex = branch;
    });
    return res;
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
}
