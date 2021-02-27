import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BranchModel } from '../../../../shared/git/Branch.model';

@Component({
  selector: 'app-merge-branch',
  templateUrl: './merge-branch.component.html',
  styleUrls: ['./merge-branch.component.scss'],
})
export class MergeBranchComponent {
  @Input() uidSalt: number;
  @Input() locals: BranchModel[];
  @Input() remotes: BranchModel[];
  @Input() activeMergeInfo: {
    into: BranchModel;
    target: BranchModel;
    currentBranch: BranchModel;
  };
  @Output() onCancel = new EventEmitter();
  @Output() onFinish = new EventEmitter();

  constructor() {}

  getDisabledReason() {
    if (!this.activeMergeInfo) {
      return '';
    } else if (!this.activeMergeInfo.into || !this.activeMergeInfo.target) {
      return 'Both To & From branches must be selected to proceed';
    } else if (
      this.activeMergeInfo.into.name == this.activeMergeInfo.target.name
    ) {
      return 'To & From branches must be different';
    } else {
      return '';
    }
  }

  swapTargets() {
    const into = this.activeMergeInfo.into;
    this.activeMergeInfo.into = this.activeMergeInfo.target;
    this.activeMergeInfo.target = into;
  }
}
