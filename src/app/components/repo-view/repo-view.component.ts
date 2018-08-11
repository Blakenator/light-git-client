import {ApplicationRef, Component, ErrorHandler, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
import {ElectronService} from "../../providers/electron.service";
import {SettingsService} from "../../providers/settings.service";
import {RepositoryModel} from "../../../../shared/Repository.model";
import {CommitModel} from "../../../../shared/Commit.model";
import {Channels} from "../../../../shared/Channels";
import {CommitSummaryModel} from "../../../../shared/CommitSummary.model";
import {BranchModel} from "../../../../shared/Branch.model";
import {GlobalErrorHandlerService} from "../common/global-error-handler.service";

@Component({
  selector: 'app-repo-view',
  templateUrl: './repo-view.component.html',
  styleUrls: ['./repo-view.component.scss']
})
export class RepoViewComponent implements OnInit, OnDestroy {
  repo: RepositoryModel;
  changes: CommitModel;
  selectedUnstagedChanges: { [key: string]: boolean } = {};
  selectedStagedChanges: { [key: string]: boolean } = {};
  diffString = "";
  commitAndPush = false;
  commitHistory: CommitSummaryModel[] = [];
  showDiff = false;
  errorMessage: { error: string };
  @Input() repoPath = "C:/Users/blake/Documents/projects/test-repo";
  localBranchFilter: string;
  remoteBranchFilter: string;
  globalErrorHandlerService: GlobalErrorHandlerService;
  private interval;

  constructor(private electronService: ElectronService,
              private settingsService: SettingsService,
              errorHandler: ErrorHandler,
              public applicationRef: ApplicationRef) {
    this.globalErrorHandlerService = <GlobalErrorHandlerService>errorHandler;
  }

  ngOnInit() {
    this.electronService.rpc(Channels.LOADREPO, [this.repoPath]).then(repo => {
      this.repo = new RepositoryModel().copy(repo);
      this.getFileChanges();
      this.getCommitHistory();
      this.applicationRef.tick();
      this.interval = setInterval(() => {
        this.getFileChanges();
        this.getBranchChanges();
      }, 1000 * 60 * 5);
    });
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  @HostListener('window:focus', ['$event'])
  onFocus(event: any): void {
    this.getFileChanges();
    this.getBranchChanges();
  }


  stageAll() {
    this.electronService.rpc(Channels.GITSTAGE, [this.repo.path, '.']).then(changes => this.handleFileChanges(changes)).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  stageSelected() {
    if (Object.values(this.selectedUnstagedChanges).filter(x => x).length == 0) {
      return;
    }
    let arg = Object.keys(this.selectedUnstagedChanges).filter(x => this.selectedUnstagedChanges[x]).join(' ');
    this.electronService.rpc(Channels.GITSTAGE, [this.repo.path, arg]).then(changes => this.handleFileChanges(changes)).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  unstageAll() {
    this.electronService.rpc(Channels.GITUNSTAGE, [this.repo.path, '.']).then(changes => this.handleFileChanges(changes)).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  unstageSelected() {
    if (Object.values(this.selectedStagedChanges).filter(x => x).length == 0) {
      return;
    }
    let arg = Object.keys(this.selectedStagedChanges).filter(x => this.selectedStagedChanges[x]).join(' ');
    this.electronService.rpc(Channels.GITUNSTAGE, [this.repo.path, arg]).then(changes => this.handleFileChanges(changes)).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  getFileChanges() {
    this.electronService.rpc(Channels.GETFILECHANGES, [this.repo.path,]).then(changes => this.handleFileChanges(changes)).catch(err => this.handleErrorMessage(err));
  }

  getBranchChanges() {
    this.electronService.rpc(Channels.GETBRANCHES, [this.repo.path,]).then(changes => this.handleBranchChanges(changes)).catch(err => this.handleErrorMessage(err));
  }

  deleteBranch(branch) {
    this.electronService.rpc(Channels.DELETEBRANCH, [this.repo.path, branch]).then(changes => this.handleBranchChanges(changes)).catch(err => this.handleErrorMessage(err));
  }

  openTerminal() {
    this.electronService.rpc(Channels.OPENTERMINAL, [this.repo.path,]).then(ignore => {
    });
  }

  openFolder() {
    this.electronService.rpc(Channels.OPENFOLDER, [this.repo.path,]).then(ignore => {
    });
  }

  getFileDiff() {
    let unstaged = Object.keys(this.selectedUnstagedChanges).filter(x => this.selectedUnstagedChanges[x]).join(' ');
    let staged = Object.keys(this.selectedStagedChanges).filter(x => this.selectedStagedChanges[x]).join(' ');
    if (!staged.trim() && !unstaged.trim()) {
      unstaged = '.';
      staged = '.';
    }
    this.electronService.rpc(Channels.GETFILEDIFF, [this.repo.path, unstaged, staged]).then(diff => {
      this.diffString = diff;
      this.applicationRef.tick();
    }).catch(err => this.handleErrorMessage(err));
  }

  getCommitHistory() {
    this.electronService.rpc(Channels.GETCOMMITHISTORY, [this.repo.path]).then(commits => {
      this.commitHistory = commits.map(x => Object.assign(new CommitSummaryModel(), x));
      this.applicationRef.tick();
    }).catch(err => this.handleErrorMessage(err));
  }

  commit() {
    if (this.changes.stagedChanges.length == 0) {
      return;
    }
    this.electronService.rpc(Channels.COMMIT, [this.repo.path, this.changes.description, this.commitAndPush]).then(changes => {
      this.handleFileChanges(changes);
      this.getCommitHistory();
      this.changes.description = '';
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  checkout(branch: string, newBranch: boolean) {
    this.electronService.rpc(Channels.CHECKOUT, [this.repo.path, branch, newBranch]).then(changes => {
      this.handleFileChanges(changes);
      this.getCommitHistory();
      this.getBranchChanges();
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  pull() {
    this.electronService.rpc(Channels.PULL, [this.repo.path]).then(changes => {
      this.handleFileChanges(changes);
      this.getCommitHistory();
      this.getBranchChanges();
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  push(branch: string, force: boolean) {
    this.electronService.rpc(Channels.PUSH, [this.repo.path, branch, force]).then(changes => {
      this.getCommitHistory();
      this.getBranchChanges();
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  deleteClicked(files: string[]) {
    this.electronService.rpc(Channels.DELETEFILES, [this.repo.path, files]).then(changes => {
      this.handleFileChanges(changes);
      this.getBranchChanges();
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  merge(file: string) {
    this.electronService.rpc(Channels.MERGE, [this.repo.path, file, 'sourcetree']).then(changes => this.handleFileChanges(changes))
      .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  hardReset() {
    this.electronService.rpc(Channels.HARDRESET, [this.repo.path]).then(changes => this.handleFileChanges(changes))
      .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  undoFileChanges(file: string, revision: string = '') {
    this.electronService.rpc(Channels.UNDOFILECHANGES, [this.repo.path, file, revision]).then(changes => {
      this.handleFileChanges(changes);
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  isRemoteAlreadyCheckedOut(branch: string) {
    return this.repo.localBranches.filter(x => x.name == branch.replace('origin/', '')).length > 0;
  }

  getCurrentBranch(): BranchModel {
    return this.repo.localBranches.find(x => x.isCurrentBranch);
  }

  getBranchName(branch: BranchModel) {
    return branch.name;
  }

  private clearSelectedChanges() {
    this.selectedUnstagedChanges = {};
    this.selectedStagedChanges = {};
  }

  private handleFileChanges(changes: CommitModel) {
    this.changes = Object.assign(new CommitModel(), changes, {description: this.changes ? this.changes.description : ''});
    this.getFileDiff();
    this.applicationRef.tick();
  }

  private handleBranchChanges(changes: RepositoryModel) {
    this.repo.localBranches = changes.localBranches.map(b => Object.assign(new BranchModel(), b));
    this.repo.remoteBranches = changes.remoteBranches.map(b => Object.assign(new BranchModel(), b));
    this.applicationRef.tick();
  }

  private handleErrorMessage(content: string) {
    this.errorMessage = {error: content};
  }
}
