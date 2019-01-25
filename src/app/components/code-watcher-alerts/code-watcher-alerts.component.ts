import {ApplicationRef, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {DiffHeaderModel} from '../../../../shared/git/diff.header.model';
import {CodeWatcherModel} from '../../../../shared/code-watcher.model';
import {GitService} from '../../services/git.service';
import {SettingsService} from '../../services/settings.service';
import {ErrorService} from '../../common/services/error.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {DiffHunkModel} from '../../../../shared/git/diff.hunk.model';
import {CodeWatcherService, ShowWatchersRequest} from '../../services/code-watcher.service';

@Component({
  selector: 'app-code-watcher-alerts',
  templateUrl: './code-watcher-alerts.component.html',
  styleUrls: ['./code-watcher-alerts.component.scss']
})
export class CodeWatcherAlertsComponent implements OnInit {
  @Output() onCommitClicked = new EventEmitter<any>();
  showWindow = false;
  filter = '';
  watcherAlerts: { file: string, hunks: { hunk: DiffHunkModel, watchers: CodeWatcherModel[] }[] }[] = [];
  showWatchersRequest: ShowWatchersRequest;

  constructor(private gitService: GitService,
              private settingsService: SettingsService,
              private codeWatcherService: CodeWatcherService,
              private errorService: ErrorService,
              private applicationRef: ApplicationRef) {
    codeWatcherService.onShowWatchers.asObservable().subscribe(request => this.checkFileWatchers(request));
  }

  ngOnInit() {
  }

  checkFileWatchers(request: ShowWatchersRequest) {
    this.showWatchersRequest = request;
    if (request.forHeader) {
      this.parseDiffInformation([request.forHeader]);
    } else {
      this.gitService.getFileDiff(['.'], ['.'])
          .then((diff: DiffHeaderModel[]) => {
            this.parseDiffInformation(diff);
          })
          .catch(err => {
            this.errorService.receiveError(new ErrorModel('Code watchers component, getFileChanges',
              'getting file changes',
              err));
            this.watcherAlerts = [];
            this.onCommitClicked.emit();
          });
    }
  }

  getHunkCode(hunk: DiffHunkModel, includeLineNumbers: boolean = true) {
    return CodeWatcherService.getHunkCode(hunk, this.settingsService.settings, includeLineNumbers);
  }

  cancel() {
    this.showWindow = false;
  }

  commitAnyway() {
    this.onCommitClicked.emit();
    this.showWindow = false;
  }

  getLineFromMatch(hunk: DiffHunkModel, watcher: CodeWatcherModel) {
    let code = this.getHunkCode(hunk, false);
    let before = CodeWatcherModel.toRegex(watcher).exec(code).index;
    return hunk.toStartLine + code.substring(0, before).split(/\r?\n/).length - 1;
  }

  private parseDiffInformation(diff: DiffHeaderModel[]) {
    let alerts = CodeWatcherService.getWatcherAlerts(this.settingsService.settings, diff);
    if (alerts.length == 0) {
      this.watcherAlerts = [];
      if (this.showWatchersRequest.isCommit) {
        this.onCommitClicked.emit();
      }
    } else {
      this.watcherAlerts = alerts;
      this.showWindow = true;
    }
    this.applicationRef.tick();
  }
}
