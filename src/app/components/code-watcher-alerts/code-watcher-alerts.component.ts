import {ApplicationRef, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DiffHunkModel, DiffModel, LineState} from '../../../../shared/diff.model';
import {CodeWatcherModel} from '../../../../shared/code-watcher.model';
import {GitService} from '../../providers/git.service';
import {SettingsService} from '../../providers/settings.service';

@Component({
  selector: 'app-code-watcher-alerts',
  templateUrl: './code-watcher-alerts.component.html',
  styleUrls: ['./code-watcher-alerts.component.scss']
})
export class CodeWatcherAlertsComponent implements OnInit {
  @Output() onCommitClicked = new EventEmitter<any>();
  showWindow = false;
  errorMessage: { error: string };
  filter: string;
  watcherAlerts: { file: string, hunks: { hunk: DiffHunkModel, watchers: CodeWatcherModel[] }[] }[] = [];

  constructor(private gitService: GitService,
              private settingsService: SettingsService,
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
                // TODO: decide whether or not to include only changed lines or surrounding lines too
                return {hunk: h, code: h.lines.filter(l => l.state != LineState.REMOVED).map(l => l.text).join('\n')};
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
          this.handleErrorMessage(err);
          this.watcherAlerts = [];
          this.onCommitClicked.emit();
        });
  }

  getHunkCode(hunk: DiffHunkModel) {
    return hunk.lines.filter(x => x.state != LineState.REMOVED).map(x => x.text).join('\n');
  }

  cancel() {
    this.showWindow = false;
  }

  handleErrorMessage(content: string) {
    this.errorMessage = {error: content};
  }

  commitAnyway() {
    this.onCommitClicked.emit();
    this.showWindow = false;
  }
}
