import {
  ApplicationRef,
  Component,
  EventEmitter,
  OnInit,
  Output,
} from '@angular/core';
import { DiffHeaderModel } from '../../../../shared/git/diff.header.model';
import { CodeWatcherModel } from '../../../../shared/code-watcher.model';
import { GitService } from '../../services/git.service';
import { SettingsService } from '../../services/settings.service';
import { ErrorService } from '../../common/services/error.service';
import { ErrorModel } from '../../../../shared/common/error.model';
import { DiffHunkModel } from '../../../../shared/git/diff.hunk.model';
import {
  CodeWatcherService,
  ShowWatchersRequest,
} from '../../services/code-watcher.service';
import { ModalService } from '../../common/services/modal.service';
import { JobSchedulerService } from '../../services/job-system/job-scheduler.service';

@Component({
  selector: 'app-code-watcher-alerts',
  templateUrl: './code-watcher-alerts.component.html',
  styleUrls: ['./code-watcher-alerts.component.scss'],
})
export class CodeWatcherAlertsComponent {
  @Output() onCommitClicked = new EventEmitter<any>();
  filter = '';
  watcherAlerts: {
    file: string;
    hunks: { hunk: DiffHunkModel; watchers: CodeWatcherModel[] }[];
  }[] = [];
  showWatchersRequest: ShowWatchersRequest;

  constructor(
    private gitService: GitService,
    private settingsService: SettingsService,
    private codeWatcherService: CodeWatcherService,
    private errorService: ErrorService,
    private modalService: ModalService,
    private jobSchedulerService: JobSchedulerService,
    private applicationRef: ApplicationRef,
  ) {
    codeWatcherService.onShowWatchers
      .asObservable()
      .subscribe((request) => this.checkFileWatchers(request));
  }

  checkFileWatchers(request: ShowWatchersRequest) {
    this.showWatchersRequest = request;
    if (request.forHeader) {
      this.parseDiffInformation([request.forHeader]);
    } else {
      this.jobSchedulerService
        .scheduleSimpleOperation(
          this.gitService.getFileDiff(request.isCommit ? [] : ['.'], ['.']),
        )
        .result.then((diff: DiffHeaderModel[]) => {
          this.parseDiffInformation(diff);
        })
        .catch((err) => {
          this.errorService.receiveError(
            new ErrorModel(
              'Code watchers component, getFileChanges',
              'getting file changes',
              err,
            ),
          );
          this.watcherAlerts = [];
          this.onCommitClicked.emit();
        });
    }
  }

  getHunkCode(hunk: DiffHunkModel, includeLineNumbers: boolean = true) {
    return this.codeWatcherService.getHunkCode(hunk, includeLineNumbers);
  }

  cancel() {
    this.modalService.setModalVisible('codeWatcherModal', false);
  }

  commitAnyway() {
    this.onCommitClicked.emit();
    this.modalService.setModalVisible('codeWatcherModal', false);
  }

  getLinesFromMatch(hunk: DiffHunkModel, watcher: CodeWatcherModel) {
    let code = this.getHunkCode(hunk, false);
    let lineNums: number[] = [];
    let watcherRegex = CodeWatcherModel.toRegex(watcher);
    let currentMatch = watcherRegex.exec(code);
    while (currentMatch) {
      let before = currentMatch.index;
      lineNums.push(
        hunk.toStartLine + code.substring(0, before).split(/\r?\n/).length - 1,
      );
      currentMatch = watcherRegex.exec(code);
    }
    return lineNums;
  }

  private parseDiffInformation(diff: DiffHeaderModel[]) {
    let alerts = this.codeWatcherService.getWatcherAlerts(diff);
    if (alerts.length == 0) {
      this.watcherAlerts = [];
      if (this.showWatchersRequest.isCommit) {
        this.onCommitClicked.emit();
      }
    } else {
      this.watcherAlerts = alerts;
      this.modalService.setModalVisible('codeWatcherModal', true);
    }
    this.applicationRef.tick();
  }
}
