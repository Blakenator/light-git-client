import {ApplicationRef, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DiffHunkModel, DiffModel, LineState} from '../../../../shared/diff.model';
import {CodeWatcherModel} from '../../../../shared/code-watcher.model';
import {GitService} from '../../providers/git.service';
import {SettingsService} from '../../providers/settings.service';
import {ErrorService} from '../common/error.service';
import {ErrorModel} from '../../../../shared/error.model';

@Component({
  selector: 'app-code-watcher-alerts',
  templateUrl: './code-watcher-alerts.component.html',
  styleUrls: ['./code-watcher-alerts.component.scss']
})
export class CodeWatcherAlertsComponent implements OnInit {
  @Output() onCommitClicked = new EventEmitter<any>();
  showWindow = false;
  filter: string;
  watcherAlerts: { file: string, hunks: { hunk: DiffHunkModel, watchers: CodeWatcherModel[] }[] }[] = [];

  constructor(private gitService: GitService,
              private settingsService: SettingsService,
              private errorService: ErrorService,
              private applicationRef: ApplicationRef) {
  }

  @Input() set checkWatchers(val) {
    if (val > 0) {
      this.checkFileWatchers();
    }
  }

  ngOnInit() {
  }

  checkFileWatchers() {
    this.gitService.getFileChanges('.', '.')
        .then((diff: DiffModel[]) => {
          let watchers = this.settingsService.settings.codeWatchers.filter(x => x.enabled);
          if (watchers.length == 0) {
            this.watcherAlerts = [];
            this.onCommitClicked.emit();
            return;
          }
          let files = diff.map(x => {
            return {
              file: x.toFilename,
              hunks: x.hunks.map(h => {
                if (this.settingsService.settings.includeUnchangedInWatcherAnalysis) {
                  return {hunk: h, code: h.lines.filter(l => l.state != LineState.REMOVED).map(l => l.text).join('\n')};
                } else {
                  return {hunk: h, code: h.lines.filter(l => l.state == LineState.ADDED).map(l => l.text).join('\n')};
                }
              })
            };
          });
          let alertsByFile = files.map(f => {
            return {
              file: f.file, hunks: f.hunks.map(h => {
                return {
                  hunk: h.hunk,
                  watchers: watchers.filter(w => f.file.match(new RegExp(w.activeFilter)) && h.code.match(new RegExp(w.regex,
                    w.regexFlags)))
                };
              }).filter(h => h.watchers.length > 0)
            };
          });
          const alerts = alertsByFile.filter(x => x.hunks.length > 0);
          if (alerts.length == 0) {
            this.watcherAlerts = [];
            this.onCommitClicked.emit();
          } else {
            this.watcherAlerts = alerts;
            this.showWindow = true;
          }
          this.applicationRef.tick();
        })
        .catch(err => {
          this.errorService.receiveError(new ErrorModel('Code watchers component, getFileChanges', 'getting file changes', err));
          this.watcherAlerts = [];
          this.onCommitClicked.emit();
        });
  }

  getHunkCode(hunk: DiffHunkModel, includeLineNumbers: boolean = true) {
    let lines = hunk.lines.filter(x => x.state != LineState.REMOVED).map(x => x.text);
    if (includeLineNumbers) {
      lines = lines.map((x, i) => (hunk.toStartLine + i) + '\t' + x);
    }
    return lines.join('\n');
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
    let before = new RegExp(watcher.regex, watcher.regexFlags).exec(code).index;
    return hunk.toStartLine + code.substring(0, before).split(/\r?\n/).length - 1;
  }
}
