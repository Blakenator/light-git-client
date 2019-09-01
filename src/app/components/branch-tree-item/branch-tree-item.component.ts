import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BranchModel} from '../../../../shared/git/Branch.model';
import {WorktreeModel} from '../../../../shared/git/worktree.model';
import {SettingsService} from '../../services/settings.service';
import {FilterPipe} from '../../common/pipes/filter.pipe';

@Component({
  selector: 'app-branch-tree-item',
  templateUrl: './branch-tree-item.component.html',
  styleUrls: ['./branch-tree-item.component.scss'],
})
export class BranchTreeItemComponent implements OnInit {
  @Input() localBranches: BranchModel[];
  @Input() worktrees: WorktreeModel[];
  @Input() isLocal: boolean;
  @Input() currentPath = '';
  @Input() filter = '';
  @Output() onCheckoutClicked = new EventEmitter<{ branch: string, andPull: boolean }>();
  @Output() onPushClicked = new EventEmitter<BranchModel>();
  @Output() onForcePushClicked = new EventEmitter<BranchModel>();
  @Output() onDeleteClicked = new EventEmitter<BranchModel>();
  @Output() onFastForwardClicked = new EventEmitter<string>();
  @Output() onBranchPremergeClicked = new EventEmitter<BranchModel>();
  @Output() onMergeClicked = new EventEmitter<BranchModel>();
  @Output() onPullClicked = new EventEmitter<void>();
  @Output() onForcePullClicked = new EventEmitter<void>();
  @Output() onBranchRename = new EventEmitter<{ oldName: string, newName: string }>();
  showChildren = true;
  leaves: BranchModel[];
  children;
  activeRenames: { [key: string]: string } = {};
  actionExpanded: { [key: string]: boolean } = {};

  constructor(public settingsService: SettingsService) {
  }

  _branches: BranchModel[];

  @Input()
  set branches(val: BranchModel[]) {
    this._branches = val;
    this.loadTree();
  }

  ngOnInit() {
    this.loadTree();
  }

  loadTree() {
    this.leaves = this.getLeaves();
    this.children = this.getChildren();
  }

  getLeaves() {
    return this._branches.filter(x => x.name.substring((this.currentPath.length || -1) + 1).indexOf('/') < 0);
  }

  getChildren(): { path: string, branches: BranchModel[] }[] {
    let res: { [key: string]: BranchModel[] } = {};
    this._branches.filter(x => x.name.substring((this.currentPath.length || -1) + 1).indexOf('/') > 0)
        .forEach(x => {
          let p = x.name.substring((this.currentPath.length || -1) + 1);
          p = p.substring(0, p.indexOf('/'));
          if (res[p]) {
            res[p].push(x);
          } else {
            res[p] = [x];
          }
        });
    return Object.keys(res).map(x => {
      return {path: x, branches: res[x]};
    });
  }

  getDisplayPath() {
    return this.currentPath.substring(this.currentPath.lastIndexOf('/') + 1);
  }

  toggleChildrenVisible() {
    this.showChildren = !this.showChildren;
  }

  getChildPath(path: any) {
    return (this.currentPath ? this.currentPath + '/' : '') + path;
  }

  getLeafName(name: string) {
    return name.substring((this.currentPath.length || -1) + 1);
  }

  isRemoteAlreadyCheckedOut(name: string) {
    return !!this.localBranches.find(local => local.name == name.replace('origin/', ''));
  }

  checkedOutOtherWorktree(b: BranchModel) {
    return this.worktrees.find(w => w.currentBranch == b.name && !w.isCurrent);
  }

  renameBranch(originalName: string) {
    if(this.activeRenames[originalName]) {
      this.onBranchRename.emit({oldName: originalName, newName: this.activeRenames[originalName]});
    }
    this.cancelRename(originalName);
  }

  cancelRename(branchName: string) {
    delete (this.activeRenames[branchName]);
  }

  startRename(branchName: string) {
    this.activeRenames[branchName] = branchName;
  }

  getFilteredChildren() {
    if (this.filter === undefined) {
      return 1;
    }
    return this.children.filter(c => FilterPipe.fuzzyFilter(this.filter, c.name || ''));
  }

  checkoutBranch(name: string, ff: boolean) {
    this.onCheckoutClicked.emit({branch: name, andPull: ff});
  }

  checkFastForward(b: BranchModel) {
    if (b.isCurrentBranch) {
      this.onPullClicked.emit();
    } else if (b.behind && !b.ahead) {
      this.onFastForwardClicked.emit(b.name);
    }
  }

  isBranchCurrent(name: string) {
    return !!this.localBranches.find(local => local.name == name.replace('origin/', '') && local.isCurrentBranch);
  }
  isRenamingBranch(branch:BranchModel){
    return this.activeRenames[branch.name]!==undefined;
  }
}
