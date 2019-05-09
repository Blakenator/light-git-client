import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BranchModel} from '../../../../shared/git/Branch.model';

@Component({
  selector: 'app-branch-chooser',
  templateUrl: './branch-chooser.component.html',
  styleUrls: ['./branch-chooser.component.scss'],
})
export class BranchChooserComponent implements OnInit {
  @Input() branches: BranchModel[];
  @Input() selectedBranch: BranchModel;
  @Output() selectedBranchChange = new EventEmitter<BranchModel>();
  branchFilter: string;

  constructor() {
  }

  ngOnInit() {
  }

  getBranchName(branch: BranchModel) {
    return branch.name;
  }
}
