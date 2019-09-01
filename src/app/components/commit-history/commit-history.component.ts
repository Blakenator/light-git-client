import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/git/CommitSummary.model';
import {FilterPipe} from '../../common/pipes/filter.pipe';
import {BranchModel} from '../../../../shared/git/Branch.model';

@Component({
  selector: 'app-commit-history',
  templateUrl: './commit-history.component.html',
  styleUrls: ['./commit-history.component.scss'],
})
export class CommitHistoryComponent implements OnInit {
  @Input() commitHistory: CommitSummaryModel[];
  @Input() branches: BranchModel[];
  @Input() activeBranch: BranchModel;
  @Output() onClickCommitDiff = new EventEmitter<CommitSummaryModel>();
  @Output() onScrollDown = new EventEmitter<any>();
  @Output() onClickCherryPick = new EventEmitter<CommitSummaryModel>();
  @Output() onClickCheckout = new EventEmitter<CommitSummaryModel>();
  @Output() onChooseBranch = new EventEmitter<BranchModel>();
  scrollOffset = 0;
  numPerPage = 50;
  commitFilter: string;
  messageExpanded: { [key: string]: boolean } = {};

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
      'badge-info': !this.isPlainTag(tag) && !this.isRemoteBranch(tag) && !tag.startsWith('HEAD'),
      'badge-success': this.isPlainTag(tag),
      'badge-primary': this.isRemoteBranch(tag),
      'badge-warning': tag.startsWith('HEAD'),
    };
  }

  isRemoteBranch(tag: string) {
    return tag.startsWith('origin/');
  }

  isPlainTag(tag: string) {
    return tag.startsWith('tag: ');
  }

  getSplitCommitMessage(commit: CommitSummaryModel) {
    return commit.message.split(/\r?\n/g);
  }

  checkOverflow(element: any) {
    return element.offsetHeight < element.scrollHeight ||
      element.offsetWidth < element.scrollWidth;
  }

  expandMessage(hash: string, messageExpander: any) {
    if (this.messageExpanded[hash] != undefined || this.checkOverflow(messageExpander)) {
      this.messageExpanded[hash] = !this.messageExpanded[hash];
    }
  }

  isCurrentBranchActive() {
    return this.branches &&
      this.activeBranch &&
      this.getCurrentBranch().name == this.activeBranch.name;
  }

  getCurrentBranch() {
    return this.branches.find(b => b.isCurrentBranch);
  }

  toggleSoloCurrentBranch() {
    this.setActiveBranch(this.getCurrentBranch());
  }

  setActiveBranch(b: any) {
    this.activeBranch = !this.activeBranch || b.name != this.activeBranch.name ? b : undefined;
    this.onChooseBranch.emit(this.activeBranch);
  }
}
