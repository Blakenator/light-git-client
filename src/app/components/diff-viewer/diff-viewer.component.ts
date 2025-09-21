import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommitSummaryModel } from '../../../../shared/git/CommitSummary.model';
import { DiffHeaderModel } from '../../../../shared/git/diff.header.model';
import { SettingsService } from '../../services/settings.service';
import { GitService } from '../../services/git.service';
import { CommitModel } from '../../../../shared/git/Commit.model';
import { ErrorService } from '../../common/services/error.service';
import { ErrorModel } from '../../../../shared/common/error.model';
import { DiffHunkModel } from '../../../../shared/git/diff.hunk.model';
import {
  DiffLineModel,
  LineState,
} from '../../../../shared/git/diff.line.model';
import {
  CodeWatcherService,
  ShowWatchersRequest,
} from '../../services/code-watcher.service';
import { FilterPipe } from '../../common/pipes/filter.pipe';
import { ClipboardService } from '../../services/clipboard.service';
import { JobSchedulerService } from '../../services/job-system/job-scheduler.service';

@Component({
  selector: 'app-diff-viewer',
  templateUrl: './diff-viewer.component.html',
  styleUrls: ['./diff-viewer.component.scss'],
  standalone: false,
})
export class DiffViewerComponent {
  @Input() diffCommitInfo: CommitSummaryModel;
  editingHunk: DiffHunkModel;
  editingHeader: DiffHeaderModel;
  editedText: string;
  @Output() onHunkChanged = new EventEmitter<CommitModel>();
  @Output() onHunkChangeError = new EventEmitter<ErrorModel>();
  @Output() onIngoreWhitespaceClicked = new EventEmitter<boolean>();
  @Output() onExitCommitClicked = new EventEmitter<void>();
  @Output() onNavigateToHash = new EventEmitter<string>();
  scrollOffset = 10;
  numPerPage = 3;
  diffFilter: string;
  maxFileDiffSize = 500;
  reducedHeaders: {
    header: DiffHeaderModel;
    reducedHunks: DiffHunkModel[];
    tooLong: boolean;
  }[];

  constructor(
    public settingsService: SettingsService,
    private errorService: ErrorService,
    private codeWatcherService: CodeWatcherService,
    private gitService: GitService,
    private jobSchedulerService: JobSchedulerService,
    public clipboardService: ClipboardService,
  ) {}

  private _diffHeaders: DiffHeaderModel[];

  get diffHeaders() {
    return this._diffHeaders;
  }

  @Input()
  set diffHeaders(value: DiffHeaderModel[]) {
    this._diffHeaders = value;
    this.reducedHeaders = value.map((h) => {
      const tooLong = this.getHeaderLines(h) > this.maxFileDiffSize;
      const reduced = [];
      if (tooLong) {
        let lineCount = 0;
        for (const hunk of h.hunks) {
          if (lineCount + hunk.lines.length > this.maxFileDiffSize) {
            break;
          } else {
            lineCount += hunk.lines.length;
            reduced.push(hunk);
          }
        }
      }
      return { header: h, reducedHunks: tooLong ? reduced : h.hunks, tooLong };
    });
  }

  getHunkCode(hunk: DiffHunkModel) {
    return hunk.lines.map((x) => x.text).join('\n') + '\t';
  }

  getAddition(line: DiffLineModel) {
    return LineState.ADDED == line.state;
  }

  getDeletion(line: DiffLineModel) {
    return LineState.REMOVED == line.state;
  }

  saveSettings() {
    setTimeout(() => {
      this.settingsService.saveSettings();
      if (this.diffCommitInfo) {
        this.onExitCommitClicked.emit();
      }
      this.onIngoreWhitespaceClicked.emit(
        this.settingsService.settings.diffIgnoreWhitespace,
      );
    }, 100);
  }

  getEditableCode(hunk: DiffHunkModel) {
    return hunk.lines
      .filter((x) => x.state != LineState.REMOVED)
      .map((x) => x.text)
      .join('\n');
  }

  cancelEdit() {
    this.editingHeader = undefined;
    this.editingHunk = undefined;
  }

  saveEditedHunk() {
    if (
      !this.editingHunk ||
      !this.editingHeader ||
      this.editedText == this.getEditableCode(this.editingHunk)
    ) {
      this.editingHeader = undefined;
      this.editingHunk = undefined;
      return;
    }
    this.jobSchedulerService
      .scheduleSimpleOperation(
        this.gitService.changeHunk(
          this.editingHeader.toFilename,
          this.editingHunk,
          this.editedText,
        ),
      )
      .result.then(() => {
        this.onHunkChanged.emit();
        this.editingHeader = undefined;
        this.editingHunk = undefined;
      })
      .catch((error) =>
        this.onHunkChangeError.emit(
          new ErrorModel(
            'Diff viewer component, changeHunk',
            'saving hunk changes',
            error,
          ),
        ),
      );
  }

  startEdit(hunk: DiffHunkModel, header: DiffHeaderModel) {
    this.editedText = this.getEditableCode(hunk);
    this.editingHeader = header;
    this.editingHunk = hunk;
  }

  isEditingHunk(hunk: DiffHunkModel, header: DiffHeaderModel) {
    return (
      this.editingHunk &&
      this.editingHeader &&
      this.editingHunk.fromStartLine == hunk.fromStartLine &&
      this.editingHeader.fromFilename == header.fromFilename
    );
  }

  undoHunk(hunk: DiffHunkModel, header: DiffHeaderModel) {
    this.startEdit(hunk, header);
    this.editedText = hunk.lines
      .filter((x) => x.state != LineState.ADDED)
      .map((x) => x.text)
      .join('\n');
    this.saveEditedHunk();
  }

  hasConflictingWatcher(hunk: DiffHunkModel, header: DiffHeaderModel) {
    return (
      this.codeWatcherService.getWatcherAlerts([
        this.getTemporaryHunk(header, hunk),
      ]).length > 0
    );
  }

  watcherClick(hunk: DiffHunkModel, header: DiffHeaderModel) {
    const temp = this.getTemporaryHunk(header, hunk);
    this.codeWatcherService.showWatchers(new ShowWatchersRequest(false, temp));
  }

  scrolled(down: boolean) {
    if (down) {
      this.scrollOffset += this.numPerPage;
    }
    if (!down) {
      this.scrollOffset = this.numPerPage * 3;
    }
    this.scrollOffset = Math.round(
      Math.max(
        this.numPerPage * 3,
        Math.min(this.scrollOffset, this.diffHeaders.length - this.numPerPage),
      ),
    );
  }

  getFilteredDiffHeaders() {
    if (!this.diffFilter) {
      return this.reducedHeaders.slice(0, this.scrollOffset);
    } else {
      return this.reducedHeaders
        .filter((header) => {
          const needle = this.diffFilter.toLowerCase();
          return (
            FilterPipe.fuzzyFilter(
              needle,
              header.header.fromFilename.toLowerCase(),
            ) ||
            FilterPipe.fuzzyFilter(
              needle,
              header.header.toFilename.toLowerCase(),
            )
          );
        })
        .slice(0, this.scrollOffset);
    }
  }

  getHeaderLines(header: DiffHeaderModel) {
    return header.hunks.map((x) => x.lines.length).reduce((a, b) => a + b, 0);
  }

  getLocalExpandedDefault(header: DiffHeaderModel) {
    return (
      header.action != 'Deleted' &&
      this.getHeaderLines(header) < this.maxFileDiffSize &&
      header.hunks.length > 0
    );
  }

  private getTemporaryHunk(header: DiffHeaderModel, hunk: DiffHunkModel) {
    const temp = Object.assign(new DiffHeaderModel(), header);
    temp.hunks = [hunk];
    return temp;
  }
}
