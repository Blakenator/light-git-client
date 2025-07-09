import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { BranchModel } from '../../../../shared/git/Branch.model';
import { WorktreeModel } from '../../../../shared/git/worktree.model';
import { SettingsService } from '../../services/settings.service';
import { FilterPipe } from '../../common/pipes/filter.pipe';
import { TabDataService } from '../../services/tab-data.service';
import { ClipboardService } from '../../services/clipboard.service';

enum TrackingMode {
  remote,
  local,
  broken,
}

@Component({
  selector: 'app-branch-tree-item',
  templateUrl: './branch-tree-item.component.html',
  styleUrls: ['./branch-tree-item.component.scss'],
})
export class BranchTreeItemComponent implements OnInit {
  @Input() worktrees: WorktreeModel[];
  @Input() isLocal: boolean;
  @Input() currentPath = '';
  @Input() filter = '';
  @Input() activeRenames: Map<string, string> = new Map<string, string>();
  @Input() actionExpandedMap: Map<string, boolean> = new Map<string, boolean>();
  @Input() showChildrenMap: Map<string, boolean> = new Map<string, boolean>();

  @Output() onCheckoutClicked = new EventEmitter<{
    branch: string;
    andPull: boolean;
  }>();
  @Output() onPushClicked = new EventEmitter<BranchModel>();
  @Output() onForcePushClicked = new EventEmitter<BranchModel>();
  @Output() onDeleteClicked = new EventEmitter<BranchModel>();
  @Output() onFastForwardClicked = new EventEmitter<BranchModel>();
  @Output() onBranchPremergeClicked = new EventEmitter<BranchModel>();
  @Output() onMergeClicked = new EventEmitter<BranchModel>();
  @Output() onRebaseClicked = new EventEmitter<BranchModel>();
  @Output() onInteractiveRebaseClicked = new EventEmitter<BranchModel>();
  @Output() onPullClicked = new EventEmitter<void>();
  @Output() onForcePullClicked = new EventEmitter<void>();
  @Output() onBranchRename = new EventEmitter<{
    oldName: string;
    newName: string;
  }>();
  leaves: BranchModel[];
  children: { path: string; branches: BranchModel[] }[];

  TrackingMode = TrackingMode;

  constructor(
    public settingsService: SettingsService,
    public tabDataService: TabDataService,
    public clipboardService: ClipboardService,
  ) {}

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
    return this._branches.filter(
      (x) =>
        x.name.substring((this.currentPath.length || -1) + 1).indexOf('/') < 0,
    );
  }

  getChildren(): { path: string; branches: BranchModel[] }[] {
    let res: { [key: string]: BranchModel[] } = {};
    this._branches
      .filter(
        (x) =>
          x.name.substring((this.currentPath.length || -1) + 1).indexOf('/') >
          0,
      )
      .forEach((x) => {
        let p = x.name.substring((this.currentPath.length || -1) + 1);
        p = p.substring(0, p.indexOf('/'));
        if (res[p]) {
          res[p].push(x);
        } else {
          res[p] = [x];
        }
      });
    return Object.keys(res).map((x) => {
      return { path: x, branches: res[x] };
    });
  }

  getDisplayPath() {
    return this.currentPath.substring(this.currentPath.lastIndexOf('/') + 1);
  }

  shouldShowChildren(): boolean {
    return this.showChildrenMap.get(this.currentPath) ?? true;
  }

  isActionExpanded(branchName: string): boolean {
    return this.actionExpandedMap.get(branchName);
  }

  toggleChildrenVisible() {
    this.showChildrenMap.set(this.currentPath, !this.shouldShowChildren());
  }

  toggleActionExpanded(branchName: string) {
    this.actionExpandedMap.set(branchName, !this.isActionExpanded(branchName));
  }

  getChildPath(path: any) {
    return (this.currentPath ? this.currentPath + '/' : '') + path;
  }

  getLeafName(name: string) {
    return name.substring((this.currentPath.length || -1) + 1);
  }

  isRemoteAlreadyCheckedOut(name: string) {
    return this.tabDataService
      .getLocalBranchMap()
      .has(name.replace('origin/', ''));
  }

  checkedOutOtherWorktree(b: BranchModel) {
    return this.worktrees.find(
      (w) => w.currentBranch == b.name && !w.isCurrent,
    );
  }

  renameBranch(oldName: string) {
    let newName = this.activeRenames.get(oldName);
    if (newName) {
      this.onBranchRename.emit({ oldName, newName });
    }
    this.cancelRename(oldName);
  }

  cancelRename(branchName: string) {
    this.activeRenames.delete(branchName);
  }

  startRename(branchName: string) {
    this.activeRenames.set(branchName, branchName);
  }

  getFilteredChildren() {
    if (this.filter === undefined) {
      return 1;
    }
    return this.children.filter((c) =>
      FilterPipe.fuzzyFilter(this.filter, c.path || ''),
    );
  }

  checkoutBranch(name: string, ff: boolean) {
    this.onCheckoutClicked.emit({ branch: name, andPull: ff });
  }

  checkFastForward(b: BranchModel) {
    if (b.isCurrentBranch) {
      this.onPullClicked.emit();
    } else if (b.behind && !b.ahead) {
      this.onFastForwardClicked.emit(b);
    }
  }

  isBranchCurrent(name: string) {
    return !!this.tabDataService
      .getLocalBranchMap()
      .get(name.replace('origin/', ''))?.isCurrentBranch;
  }

  isRenamingBranch(branch: BranchModel) {
    return this.activeRenames.has(branch.name);
  }

  getTrackingMode(branch: BranchModel) {
    if (
      branch.trackingPath.indexOf('origin/') === 0 &&
      !branch.isTrackingPathGone
    ) {
      return TrackingMode.remote;
    } else if (branch.isTrackingPathGone) {
      return TrackingMode.broken;
    } else {
      return TrackingMode.local;
    }
  }
}
