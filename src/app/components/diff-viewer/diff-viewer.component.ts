import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/git/CommitSummary.model';
import {DiffHeaderModel} from '../../../../shared/git/diff.header.model';
import {SettingsService} from '../../services/settings.service';
import {GitService} from '../../services/git.service';
import {CommitModel} from '../../../../shared/git/Commit.model';
import {ErrorService} from '../common/services/error.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {DiffHunkModel} from '../../../../shared/git/diff.hunk.model';
import {DiffLineModel, LineState} from '../../../../shared/git/diff.line.model';
import {CodeWatcherService, ShowWatchersRequest} from '../../services/code-watcher.service';
import {FilterPipe} from '../common/pipes/filter.pipe';

@Component({
  selector: 'app-diff-viewer',
  templateUrl: './diff-viewer.component.html',
  styleUrls: ['./diff-viewer.component.scss']
})
export class DiffViewerComponent implements OnInit {
  @Input() diffHeaders: DiffHeaderModel[];
  @Input() diffCommitInfo: CommitSummaryModel;
  matchingSelection = 'words';
  editingHunk: DiffHunkModel;
  editingHeader: DiffHeaderModel;
  editedText: string;
  @Output() onHunkChanged = new EventEmitter<CommitModel>();
  @Output() onHunkChangeError = new EventEmitter<ErrorModel>();
  @Output() onIngoreWhitespaceClicked = new EventEmitter<boolean>();
  scrollOffset = 10;
  numPerPage = 3;
  diffFilter: string;

  constructor(public settingsService: SettingsService,
              private errorService: ErrorService,
              private codeWatcherService: CodeWatcherService,
              private gitService: GitService) {
  }

  ngOnInit() {
  }

  getHunkCode(hunk: DiffHunkModel) {
    return hunk.lines.map(x => x.text).join('\n') + '\t';
  }

  getAddition(line: DiffLineModel) {
    return LineState.ADDED == line.state;
  }

  getDeletion(line: DiffLineModel) {
    return LineState.REMOVED == line.state;
  }

  getHeaderTag(header: DiffHeaderModel) {
    if (header.toFilename == header.fromFilename) {
      if (header.hunks.every(x => x.fromNumLines == 0)) {
        return 'Added';
      } else if (header.hunks.every(x => x.toNumLines == 0)) {
        return 'Deleted';
      } else {
        return 'Changed';
      }
    } else if (header.fromFilename.substring(header.fromFilename.lastIndexOf('/')) ==
               header.toFilename.substring(header.toFilename.lastIndexOf(
                 '/'))) {
      return 'Moved';
    } else if (header.fromFilename.substring(0, header.fromFilename.lastIndexOf('/')) == header.toFilename.substring(0,
      header.toFilename.lastIndexOf('/'))) {
      return 'Renamed';
    }
  }

  saveSettings() {
    setTimeout(() => {
      this.settingsService.saveSettings();
      this.onIngoreWhitespaceClicked.emit(this.settingsService.settings.diffIgnoreWhitespace);
    }, 100);
  }

  getEditableCode(hunk: DiffHunkModel) {
    return hunk.lines.filter(x => x.state != LineState.REMOVED).map(x => x.text).join('\n');
  }

  cancelEdit() {
    this.editingHeader = undefined;
    this.editingHunk = undefined;
  }

  saveEditedHunk() {
    if (!this.editingHunk || !this.editingHeader || this.editedText == this.getEditableCode(this.editingHunk)) {
      this.editingHeader = undefined;
      this.editingHunk = undefined;
      return;
    }
    this.gitService.changeHunk(this.editingHeader.toFilename, this.editingHunk, this.editedText)
        .then(changes => {
          this.onHunkChanged.emit(changes);
          this.editingHeader = undefined;
          this.editingHunk = undefined;
        })
        .catch(error => this.onHunkChangeError.emit(new ErrorModel('Diff viewer component, changeHunk',
          'saving hunk changes',
          error)));
  }

  startEdit(hunk: DiffHunkModel, header: DiffHeaderModel) {
    this.editedText = this.getEditableCode(hunk);
    this.editingHeader = header;
    this.editingHunk = hunk;
  }

  isEditingHunk(hunk: DiffHunkModel, header: DiffHeaderModel) {
    return this.editingHunk &&
           this.editingHeader &&
           this.editingHunk.fromStartLine ==
           hunk.fromStartLine &&
           this.editingHeader.fromFilename ==
           header.fromFilename;
  }

  undoHunk(hunk: DiffHunkModel, header: DiffHeaderModel) {
    this.startEdit(hunk, header);
    this.editedText = hunk.lines.filter(x => x.state != LineState.ADDED).map(x => x.text).join('\n');
    this.saveEditedHunk();
  }

  hasConflictingWatcher(hunk: DiffHunkModel, header: DiffHeaderModel) {
    return CodeWatcherService.getWatcherAlerts(this.settingsService.settings,
      [this.getTemporaryHunk(header, hunk)]).length > 0;
  }

  watcherClick(hunk: DiffHunkModel, header: DiffHeaderModel) {
    let temp = this.getTemporaryHunk(header, hunk);
    this.codeWatcherService.showWatchers(new ShowWatchersRequest(false, temp));
  }

  scrolled(down: boolean) {
    if (down) {
      this.scrollOffset += this.numPerPage;
    }
    if (!down) {
      this.scrollOffset = this.numPerPage * 3;
    }
    this.scrollOffset = Math.round(Math.max(this.numPerPage * 3,
      Math.min(this.scrollOffset, this.diffHeaders.length - this.numPerPage)));
  }

  getFilteredDiffHeaders() {
    if (!this.diffFilter) {
      return this.diffHeaders;
    } else {
      return this.diffHeaders.filter(header => {
        return FilterPipe.fuzzyFilter(this.diffFilter, header.fromFilename) ||
               FilterPipe.fuzzyFilter(this.diffFilter, header.toFilename);
      });
    }
  }

  private getTemporaryHunk(header: DiffHeaderModel, hunk: DiffHunkModel) {
    let temp = Object.assign(new DiffHeaderModel(), header);
    temp.hunks = [hunk];
    return temp;
  }
}
