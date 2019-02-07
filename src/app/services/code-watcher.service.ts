import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {DiffHeaderModel} from '../../../shared/git/diff.header.model';
import {LineState} from '../../../shared/git/diff.line.model';
import {DiffHunkModel} from '../../../shared/git/diff.hunk.model';
import {CodeWatcherModel} from '../../../shared/code-watcher.model';
import {SettingsService} from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class CodeWatcherService {
  onShowWatchers = new Subject<ShowWatchersRequest>();

  constructor(private settingsService: SettingsService) {
  }

  getWatcherAlerts(diff: DiffHeaderModel[]) {
    let watchers = this.settingsService.settings.codeWatchers.filter(x => x.enabled);
    if (watchers.length == 0) {
      return [];
    }
    return diff.map(x => {
      return {
        file: x.toFilename,
        hunks: x.hunks.map(h => {
          if (this.settingsService.settings.includeUnchangedInWatcherAnalysis) {
            return {
              hunk: h,
              watchers: this.getWatchersForHunk(h, watchers, x.toFilename),
            };
          } else {
            return {
              hunk: h,
              watchers: this.getWatchersForHunk(h, watchers, x.toFilename),
            };
          }
        }).filter(h => h.watchers.length > 0),
      };
    }).filter(x => x.hunks.length > 0);
  }

  getHunkCode(hunk, includeLineNumbers: boolean = false) {
    return hunk.lines.filter(
      line => this.settingsService.settings.includeUnchangedInWatcherAnalysis ? line.state != LineState.REMOVED : line.state == LineState.ADDED)
               .map((l, i) => (includeLineNumbers ? hunk.toStartLine + i + '\t' : '') + l.text)
               .join('\n');
  }

  getWatchersForHunk(hunk: DiffHunkModel,
                     watchers: CodeWatcherModel[],
                     filename: string): CodeWatcherModel[] {
    return watchers.filter(w =>
      filename.match(new RegExp(w.activeFilter)) &&
      this.getHunkCode(hunk).match(new RegExp(w.regex, w.regexFlags)));
  }

  public showWatchers(request: ShowWatchersRequest = new ShowWatchersRequest()) {
    this.onShowWatchers.next(request);
  }
}

export class ShowWatchersRequest {
  public isCommit;
  public forHeader?: DiffHeaderModel;

  constructor(isCommit: boolean = true, forHeader?: DiffHeaderModel) {
    this.isCommit = isCommit;
    this.forHeader = forHeader;
  }
}
