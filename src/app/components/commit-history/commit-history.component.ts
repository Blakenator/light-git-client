import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommitSummaryModel } from '../../../../shared/git/CommitSummary.model';
import { FilterPipe } from '../../common/pipes/filter.pipe';
import { BranchModel } from '../../../../shared/git/Branch.model';
import { EqualityUtil } from '../../common/equality.util';
import { TabDataService } from '../../services/tab-data.service';
import { ResizeObserver } from '@juggle/resize-observer';

@Component({
  selector: 'app-commit-history',
  templateUrl: './commit-history.component.html',
  styleUrls: ['./commit-history.component.scss'],
})
export class CommitHistoryComponent {
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
  private _lastCommitHistory: CommitSummaryModel[];
  private _overflowingCommitMap = new Map<
    string,
    { observer: ResizeObserver; overflowing: boolean }
  >();

  constructor(private tabService: TabDataService) {}

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
    this.scrollOffset = Math.round(
      Math.max(
        0,
        Math.min(
          this.scrollOffset,
          this.commitHistory.length - this.numPerPage,
        ),
      ),
    );
    if (this.scrollOffset >= this.commitHistory.length - this.numPerPage) {
      this.onScrollDown.emit();
    }
  }

  getFilteredCommitHistory(): CommitSummaryModel[] {
    let result: CommitSummaryModel[];
    if (!this.commitFilter) {
      result = this.commitHistory.slice(0, this.scrollOffset + this.numPerPage);
    } else {
      result = this.commitHistory.filter((c) => {
        const needle = this.commitFilter.toLowerCase();
        return (
          FilterPipe.containsFilter(needle, c.message.toLowerCase()) ||
          FilterPipe.containsFilter(needle, c.authorName.toLowerCase()) ||
          FilterPipe.containsFilter(needle, c.authorEmail.toLowerCase()) ||
          FilterPipe.containsFilter(
            needle,
            c.authorDate.toString().toLowerCase(),
          ) ||
          c.hash.indexOf(needle) >= 0
        );
      });
    }
    if (!EqualityUtil.listsEqual(this._lastCommitHistory, result)) {
      this._lastCommitHistory = result;
      return result;
    } else {
      return this._lastCommitHistory;
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
      'badge-info':
        !this.isPlainTag(tag) &&
        !this.isRemoteBranch(tag) &&
        !tag.startsWith('HEAD'),
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

  checkOverflow(element: any, hash: string) {
    if (!this._overflowingCommitMap.has(hash)) {
      this._overflowingCommitMap.set(hash, {
        observer: new ResizeObserver((entries) => {
          this._overflowingCommitMap.get(hash).overflowing =
            element.offsetHeight < element.scrollHeight ||
            element.offsetWidth < element.scrollWidth;
        }),
        overflowing:
          element.offsetHeight < element.scrollHeight ||
          element.offsetWidth < element.scrollWidth,
      });
      this._overflowingCommitMap.get(hash).observer.observe(element);
    }

    return this._overflowingCommitMap.get(hash).overflowing;
  }

  expandMessage(hash: string, messageExpander: any) {
    if (
      this.messageExpanded[hash] != undefined ||
      this.checkOverflow(messageExpander, hash)
    ) {
      this.messageExpanded[hash] = !this.messageExpanded[hash];
    }
  }

  isCurrentBranchActive() {
    return (
      this.branches &&
      this.activeBranch &&
      this.tabService.getLocalBranchMap().get(this.activeBranch.name)
        ?.isCurrentBranch
    );
  }

  toggleSoloCurrentBranch() {
    this.setActiveBranch(this.tabService.getCurrentBranch());
  }

  setActiveBranch(b: any) {
    this.onChooseBranch.emit(
      !this.activeBranch || b.name != this.activeBranch.name ? b : undefined,
    );
  }
}
