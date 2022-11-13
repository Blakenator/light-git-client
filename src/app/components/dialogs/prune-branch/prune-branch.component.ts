import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BranchModel } from '../../../../../shared/git/Branch.model';
import { ModalService } from '../../../common/services/modal.service';
import { FilterPipe } from '../../../common/pipes/filter.pipe';

@Component({
  selector: 'app-prune-branch',
  templateUrl: './prune-branch.component.html',
  styleUrls: ['./prune-branch.component.scss'],
})
export class PruneBranchComponent implements OnInit {
  @Input() localBranches: BranchModel[];
  @Input() repoViewUid: number;
  @Output() onConfirm = new EventEmitter<BranchModel[]>();
  branchesByMerge: BranchModel[];
  branchesByAge: BranchModel[];
  byAge = false;
  age = 30;
  ageUnit = 1000 * 60 * 60 * 24;
  selectedBranches: BranchModel[] = [];
  selectedBranchesSet = new Set<string>();
  searchText: string;

  constructor(private modalService: ModalService) {}

  ngOnInit() {
    setTimeout(() => {
      this.modalService.modals['pruneConfirm' + this.repoViewUid]
        .asObservable()
        .subscribe((val) => {
          if (val) {
            this.updateBranchesByMerge();
            this.updateBranchesByAge();
          }
        });
    }, 1000);
  }

  updateBranchesByMerge() {
    this.branchesByMerge = this.localBranches
      .filter(
        (branch) =>
          !branch.trackingPath &&
          !branch.isCurrentBranch &&
          branch.name !== 'master' &&
          (!this.searchText ||
            FilterPipe.fuzzyFilter(this.searchText, branch.name)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  updateBranchesByAge() {
    this.branchesByAge = this.localBranches
      .filter(
        (branch) =>
          new Date(branch.lastCommitDate).getTime() <
            new Date().getTime() - this.age * this.ageUnit &&
          branch.name !== 'master' &&
          (!this.searchText ||
            FilterPipe.fuzzyFilter(this.searchText, branch.name)),
      )
      .sort(
        (a, b) =>
          new Date(b.lastCommitDate).getTime() -
          new Date(a.lastCommitDate).getTime(),
      );
  }

  confirm() {
    this.onConfirm.emit(this.selectedBranches);
  }

  isConfirmDisabled() {
    return this.selectedBranches.length === 0 ? 'No branches to prune' : '';
  }

  getAgeString(branch: BranchModel) {
    let totalMinutes =
      (new Date().getTime() - new Date(branch.lastCommitDate).getTime()) /
      1000 /
      60;
    let result = [];
    let days = Math.floor(totalMinutes / 60 / 24);
    if (days > 0) {
      result.push(`${days}d`);
    }
    let hours = Math.floor(totalMinutes / 60) % 24;
    if (hours > 0 && days < 10) {
      result.push(`${hours}h`);
    }
    let minutes = Math.floor(totalMinutes) % 60;
    if (minutes > 0 && hours < 10 && days === 0) {
      result.push(`${minutes}m`);
    }
    return result.join(' ');
  }

  getActiveBranchList() {
    return this.byAge ? this.branchesByAge : this.branchesByMerge;
  }

  toggleBranch(branch: BranchModel) {
    if (this.selectedBranchesSet.has(branch.name)) {
      this.selectedBranchesSet.delete(branch.name);
      this.selectedBranches.splice(
        this.selectedBranches.findIndex((b) => b.name === branch.name),
        1,
      );
    } else {
      this.selectedBranchesSet.add(branch.name);
      this.selectedBranches.push(branch);
    }
  }
}
