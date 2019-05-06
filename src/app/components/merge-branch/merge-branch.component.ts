import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BranchModel} from '../../../../shared/git/Branch.model';

@Component({
  selector: 'app-merge-branch',
  templateUrl: './merge-branch.component.html',
  styleUrls: ['./merge-branch.component.scss'],
})
export class MergeBranchComponent implements OnInit {
  @Input() uidSalt: number;
  @Input() locals: BranchModel[];
  @Input() activeMergeInfo: { into: BranchModel, target: BranchModel, currentBranch: BranchModel };
  @Output() onCancel = new EventEmitter();
  @Output() onFinish = new EventEmitter();

  constructor() {
  }

  ngOnInit() {
  }

  getDisabledReason() {
    return !this.activeMergeInfo || !this.activeMergeInfo.into || !this.activeMergeInfo.target ?
           'Both To & From branches must be selected to proceed' :
           '';
  }
}
