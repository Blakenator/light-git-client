import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BranchModel} from '../../../../shared/Branch.model';
import {WorktreeModel} from '../../../../shared/worktree.model';
import {SettingsService} from '../../providers/settings.service';
import {FilterPipe} from '../../directives/filter.pipe';

@Component({
  selector: 'app-branch-tree-item',
  templateUrl: './branch-tree-item.component.html',
  styleUrls: ['./branch-tree-item.component.scss']
})
export class BranchTreeItemComponent implements OnInit {
  @Input() localBranches: BranchModel[];
  @Input() worktrees: WorktreeModel[];
  @Input() isLocal: boolean;
  @Input() currentPath = '';
  @Input() filter = '';
  @Output() onCheckoutClicked = new EventEmitter<string>();
  @Output() onPushClicked = new EventEmitter<string>();
  @Output() onDeleteClicked = new EventEmitter<string>();
  @Output() onMergeClicked = new EventEmitter<string>();
  @Output() onPullClicked = new EventEmitter<any>();
  @Output() onBranchRename = new EventEmitter<{ oldName: string, newName: string }>();
  showChildren = true;
  leaves: BranchModel[];
  children;
  activeRenames: { [key: string]: string } = {};

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

  isRemoteAlreadyCheckedOut(branch: string) {
    return this.localBranches.filter(x => x.name == branch.replace('origin/', '')).length > 0;
  }

  checkedOutOtherWorktree(b: BranchModel) {
    return this.worktrees.find(x => x.currentBranch == b.name && !x.isCurrent);
  }

  renameBranch(originalName: string) {
    this.onBranchRename.emit({oldName: originalName, newName: this.activeRenames[originalName]});
    this.cancelRename(originalName);
  }

  cancelRename(branchName: string) {
    delete(this.activeRenames[branchName]);
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
}
