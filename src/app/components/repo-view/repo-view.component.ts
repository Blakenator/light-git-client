import {
  ApplicationRef,
  Component,
  ErrorHandler,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import {ElectronService} from '../../providers/electron.service';
import {SettingsService} from '../../providers/settings.service';
import {RepositoryModel} from '../../../../shared/Repository.model';
import {CommitModel} from '../../../../shared/Commit.model';
import {Channels} from '../../../../shared/Channels';
import {CommitSummaryModel} from '../../../../shared/CommitSummary.model';
import {BranchModel} from '../../../../shared/Branch.model';
import {GlobalErrorHandlerService} from '../common/global-error-handler.service';
import {StashModel} from '../../../../shared/stash.model';
import {WorktreeModel} from '../../../../shared/worktree.model';
import {DiffModel} from '../../../../shared/diff.model';
import {FilterPipe} from '../../directives/filter.pipe';
import {CommandHistoryModel} from '../../../../shared/command-history.model';

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
  diffHeaders: DiffModel[] = [];
  commitAndPush = false;
  commitHistory: CommitSummaryModel[] = [];
  showDiff = false;
  errorMessage: { error: string };
  @Input() repoPath = 'C:/Users/blake/Documents/projects/test-repo';
  @Input() repoCache: RepositoryModel;
  localBranchFilter: string;
  remoteBranchFilter: string;
  globalErrorHandlerService: GlobalErrorHandlerService;
  isLoading = false;
  @Output() onLoadingChange = new EventEmitter<boolean>();
  worktreeFilter: string;
  diffCommitInfo: CommitSummaryModel;
  stashFilter: string;
  stagedChangesFilter: string;
  unstagedChangesFilter: string;
  commandHistoryFilter: string;
  showCreateBranch = false;
  showCreateStash = false;
  stashOnlyUnstaged = true;
  selectedAutocopleteItem = 0;
  suggestions: string[] = [];
  positionInAutoComplete: number;
  commandHistory: CommandHistoryModel[];
  private interval;
  private currentCommitCursorPosition: number;

  constructor(private electronService: ElectronService,
              private settingsService: SettingsService,
              errorHandler: ErrorHandler,
              public applicationRef: ApplicationRef) {
    this.globalErrorHandlerService = <GlobalErrorHandlerService>errorHandler;
  }

  getStashFilterText(stash: StashModel) {
    return stash.branchName + stash.message + stash.branchName;
  }

  ngOnInit() {
    this.loadRepo();
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  @HostListener('window:focus', ['$event'])
  onFocus(event: any): void {
    if (this.repo) {
      this.getFileChanges();
      this.getFileDiff();
      this.getBranchChanges();
      this.getCommitHistory();
    }
  }

  stageAll() {
    this.electronService.rpc(Channels.GITSTAGE, [this.repo.path, '.'])
        .then(changes => this.handleFileChanges(changes))
        .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  stageSelected() {
    if (Object.values(this.selectedUnstagedChanges).filter(x => x).length == 0) {
      return;
    }
    let arg = Object.keys(this.selectedUnstagedChanges).filter(x => this.selectedUnstagedChanges[x]).join(' ');
    this.electronService.rpc(Channels.GITSTAGE, [this.repo.path, arg])
        .then(changes => this.handleFileChanges(changes))
        .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  unstageAll() {
    this.electronService.rpc(Channels.GITUNSTAGE, [this.repo.path, '.'])
        .then(changes => this.handleFileChanges(changes))
        .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  unstageSelected() {
    if (Object.values(this.selectedStagedChanges).filter(x => x).length == 0) {
      return;
    }
    let arg = Object.keys(this.selectedStagedChanges).filter(x => this.selectedStagedChanges[x]).join(' ');
    this.electronService.rpc(Channels.GITUNSTAGE, [this.repo.path, arg])
        .then(changes => this.handleFileChanges(changes))
        .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  getFileChanges(keepDiffCommitSelection: boolean = true) {
    if (!this.repo) {
      return;
    }
    this.getBranchChanges();
    this.fetch();
    this.getCommitHistory();
    this.electronService.rpc(Channels.GETFILECHANGES, [this.repo.path,])
        .then(changes => this.handleFileChanges(changes, keepDiffCommitSelection))
        .catch(err => this.handleErrorMessage(err));
  }

  getBranchChanges() {
    this.electronService.rpc(Channels.GETBRANCHES, [this.repo.path,])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(err));
  }

  deleteBranch(branch: string) {
    this.electronService.rpc(Channels.DELETEBRANCH, [this.repo.path, branch])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(err));
  }

  renameBranch(branch: { oldName: string, newName: string }) {
    this.electronService.rpc(Channels.RENAMEBRANCH, [this.repo.path, branch.oldName, branch.newName])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(err));
  }

  openTerminal() {
    this.electronService.rpc(Channels.OPENTERMINAL, [this.repo.path,]).then(ignore => {
    }).catch(err => this.handleErrorMessage(err));
  }

  openFolder(path: string = '') {
    this.electronService.rpc(Channels.OPENFOLDER, [this.repo.path, path]).then(ignore => {
    }).catch(err => this.handleErrorMessage(err));
  }

  getFileDiff() {
    let unstaged = Object.keys(this.selectedUnstagedChanges).filter(x => this.selectedUnstagedChanges[x]).join(' ');
    let staged = Object.keys(this.selectedStagedChanges).filter(x => this.selectedStagedChanges[x]).join(' ');
    if (!staged.trim() && !unstaged.trim()) {
      unstaged = '.';
      staged = '.';
    }
    this.electronService.rpc(Channels.GETFILEDIFF, [this.repo.path, unstaged, staged]).then(diff => {
      this.diffHeaders = diff;
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
    this.setLoading(true);
    this.electronService.rpc(Channels.COMMIT, [this.repo.path, this.changes.description, this.commitAndPush])
        .then(changes => {
          this.handleFileChanges(changes);
          this.getCommitHistory();
          this.getFileDiff();
          this.changes.description = '';
          this.showDiff = false;
          this.setLoading(false);
        })
        .catch(err => this.handleErrorMessage(err));
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
    this.electronService.rpc(Channels.DELETEFILES, [this.repo.path, files]).then(() => {
      this.getFileChanges(true);
      this.getFileDiff();
      this.getBranchChanges();
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  merge(file: string) {
    this.electronService.rpc(Channels.MERGE, [this.repo.path, file, this.settingsService.settings.mergetool])
        .then(changes => this.handleFileChanges(changes))
        .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  stash(onlyUnstaged: boolean) {
    this.stashOnlyUnstaged = onlyUnstaged;
    this.showCreateStash = true;
  }

  createStash(stashName: string) {
    this.electronService.rpc(Channels.STASH, [this.repo.path, this.stashOnlyUnstaged, stashName]).then(changes => {
      this.handleFileChanges(changes);
      this.getBranchChanges();
    })
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
    return this.repo.localBranches.find(x => x.isCurrentBranch) || new BranchModel();
  }

  getBranchName(branch: BranchModel) {
    return branch.name;
  }

  deleteWorktree(w) {
    this.electronService.rpc(Channels.DELETEWORKTREE, [this.repo.path, w.name])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  fetch() {
    this.electronService.rpc(Channels.FETCH, [this.repo.path])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(err));
  }

  getCommandHistory() {
    this.electronService.rpc(Channels.GETCOMMANDHISTORY, [this.repo.path])
        .then(history => {
          this.commandHistory = [];
          this.applicationRef.tick();
          this.commandHistory = history;
          this.applicationRef.tick();
        })
        .catch(err => this.handleErrorMessage(err));
  }

  toggleExpandState(key: string) {
    this.settingsService.settings.expandStates[key] = !this.settingsService.settings.expandStates[key];
    this.settingsService.saveSettings();
  }

  getExpandState(key: string) {
    return this.settingsService.settings.expandStates[key];
  }

  selectionChanged() {
    this.getFileDiff();
    this.diffCommitInfo = undefined;
    setTimeout(() => this.showDiff = true, 300);
  }

  viewCommitDiff(commit: CommitSummaryModel) {
    this.electronService.rpc(Channels.COMMITDIFF, [this.repo.path, commit.hash]).then(diff => {
      this.diffHeaders = diff;
      this.showDiff = true;
      this.diffCommitInfo = commit;
      this.applicationRef.tick();
    }).catch(err => this.handleErrorMessage(err));
  }

  applyStash(index: number) {
    this.electronService.rpc(Channels.APPLYSTASH, [this.repo.path, index]).then(changes => {
      this.handleFileChanges(changes);
      this.getBranchChanges();
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  deleteStash(index: number) {
    this.electronService.rpc(Channels.DELETESTASH, [this.repo.path, index]).then(changes => {
      this.handleFileChanges(changes);
      this.getBranchChanges();
    }).catch(err => this.handleErrorMessage(err));
    this.clearSelectedChanges();
  }

  createBranch(branchName: string) {
    this.electronService.rpc(Channels.CREATEBRANCH, [this.repo.path, branchName])
        .then(changes => {
          this.handleBranchChanges(changes);
          this.getCommitHistory();
        })
        .catch(err => this.handleErrorMessage(err));
  }

  getCreateStashDefaultText() {
    return (this.repo.localBranches.find(x => x.isCurrentBranch) || new BranchModel()).lastCommitText;
  }

  getFilenameChunks(filename: string) {
    return filename.replace('->', '/->/').split('/');
  }

  getCommitSuggestions() {
    let partial = this.changes.description;
    if (!partial || !this.settingsService.settings.commitMessageAutocomplete) {
      this.suggestions = [];
      return [];
    }

    let lastWord, index = 0;
    let arr = partial.split(/[\s,]/);
    for (let i = 0; i < arr.length; i++) {
      if (index >= this.currentCommitCursorPosition) {
        break;
      }
      this.positionInAutoComplete = this.currentCommitCursorPosition - index;
      lastWord = arr[i];
      index += arr[i].length;
    }
    if (!lastWord || !lastWord.trim() || lastWord.trim().length < 5) {
      this.suggestions = [];
      return [];
    }
    let optionsSet: { [key: string]: number } = {};
    this.changes.stagedChanges.forEach(x =>
      this.getFilenameChunks(x.file)
          .forEach(y => optionsSet[y] = this.levenshtein(y.toLowerCase(), lastWord.toLowerCase())));
    this.changes.unstagedChanges.forEach(x =>
      this.getFilenameChunks(x.file)
          .forEach(y => optionsSet[y] = this.levenshtein(y.toLowerCase(), lastWord.toLowerCase())));

    const currentBranchName = this.getCurrentBranch().name;
    this.getFilenameChunks(currentBranchName)
        .forEach(y => optionsSet[y] = this.levenshtein(currentBranchName, lastWord));
    console.log(optionsSet);
    const result = Object.keys(optionsSet)
                         // .sort((a, b) => optionsSet[a] - optionsSet[b])
                         .filter(x => FilterPipe.fuzzyFilter(lastWord.toLowerCase(),
                           x.toLocaleLowerCase()) || optionsSet[x] < lastWord.length / 3)
                         .slice(0, 5);
    this.suggestions = result;
    return result;
  }

  setCurrentCursorPosition($event, suggestions) {
    this.currentCommitCursorPosition = $event.target.selectionStart;

    if (['Enter', 'ArrowUp', 'ArrowDown', 'Escape'].indexOf($event.key) < 0) {
      this.getCommitSuggestions();
    }
    if (this.suggestions.length == 0) {
      return;
    }
    $event.stopPropagation();
    if ($event.key == 'Enter') {
      this.currentCommitCursorPosition--;
      this.chooseAutocomleteItem(true);
    } else if ($event.key == 'ArrowUp') {
      this.selectedAutocopleteItem = Math.max(0, this.selectedAutocopleteItem - 1);
    } else if ($event.key == 'ArrowDown') {
      this.selectedAutocopleteItem = Math.min(this.suggestions.length, this.selectedAutocopleteItem + 1);
    } else if ($event.key == 'Escape') {
      this.suggestions = [];
    }
  }

  chooseAutocomleteItem(removeEnter: boolean, item?: number) {
    this.selectedAutocopleteItem = item || this.selectedAutocopleteItem;
    this.changes.description = this.changes.description.substring(0, this.currentCommitCursorPosition - this.positionInAutoComplete) +
      this.suggestions[this.selectedAutocopleteItem] +
      this.changes.description.substring(this.currentCommitCursorPosition + (removeEnter ? 1 : 0));
    this.selectedAutocopleteItem = 0;
    this.suggestions = [];
  }

  getCommandHistoryFilterableText(command: CommandHistoryModel) {
    return command.name + command.command;
  }

  private levenshtein(a: string, b: string): number {
    let tmp;
    if (a.length === 0) {
      return b.length;
    }
    if (b.length === 0) {
      return a.length;
    }
    if (a.length > b.length) {
      tmp = a;
      a = b;
      b = tmp;
    }

    let i, j, res, alen = a.length, blen = b.length, row = Array(alen);
    for (i = 0; i <= alen; i++) {
      row[i] = i;
    }

    for (i = 1; i <= blen; i++) {
      res = i;
      for (j = 1; j <= alen; j++) {
        tmp = row[j - 1];
        row[j - 1] = res;
        res = b[i - 1] === a[j - 1] ? tmp : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
      }
    }
    return res;
  }

  private loadRepo(path: string = '') {
    this.repoPath = path || this.repoPath;
    this.repo = this.repoCache;
    this.electronService.rpc(Channels.LOADREPO, [this.repoPath]).then(repo => {
      this.repo = new RepositoryModel().copy(repo);
      Object.assign(this.repoCache, this.repo || {});
      this.getFileChanges(false);
      this.getCommitHistory();
      this.fetch();
      this.applicationRef.tick();
      this.interval = setInterval(() => {
        this.getFileChanges();
        this.getBranchChanges();
      }, 1000 * 60 * 5);
    }).catch(err => this.handleErrorMessage(err));
  }

  private clearSelectedChanges() {
    this.selectedUnstagedChanges = {};
    this.selectedStagedChanges = {};
  }

  private handleFileChanges(changes: CommitModel, keepDiffCommitSelection: boolean = true) {
    this.changes = Object.assign(new CommitModel(),
      changes,
      {description: this.changes ? this.changes.description : ''});
    if (!keepDiffCommitSelection) {
      this.getFileDiff();
      this.diffCommitInfo = undefined;
    }
    this.getCommandHistory();
    this.applicationRef.tick();
  }

  private handleBranchChanges(changes: RepositoryModel) {
    this.repo.localBranches = changes.localBranches.map(b => Object.assign(new BranchModel(), b));
    this.repo.remoteBranches = changes.remoteBranches.map(b => Object.assign(new BranchModel(), b));
    this.repo.worktrees = changes.worktrees.map(w => Object.assign(new WorktreeModel(), w));
    this.repo.stashes = changes.stashes.map(s => Object.assign(new StashModel(), s));
    Object.assign(this.repoCache, this.repo || {});
    this.getCommandHistory();
    this.applicationRef.tick();
  }

  private handleErrorMessage(content: string) {
    this.errorMessage = {error: content};
    this.setLoading(false);
  }

  private setLoading(val: boolean) {
    this.isLoading = val;
    this.onLoadingChange.emit(val);
  }
}
