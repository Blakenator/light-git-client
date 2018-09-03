import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/CommitSummary.model';
import {DiffHunkModel, DiffLineModel, DiffModel, LineState} from '../../../../shared/diff.model';
import {SettingsService} from '../../providers/settings.service';
import {GitService} from '../../providers/git.service';
import {CommitModel} from '../../../../shared/Commit.model';

@Component({
  selector: 'app-diff-viewer',
  templateUrl: './diff-viewer.component.html',
  styleUrls: ['./diff-viewer.component.scss']
})
export class DiffViewerComponent implements OnInit {
  @Input() diffHeaders: DiffModel[];
  @Input() diffCommitInfo: CommitSummaryModel;
  matchingSelection = 'words';
  editingHunk: DiffHunkModel;
  editingHeader: DiffModel;
  editedText: string;
  @Output() onHunkChanged = new EventEmitter<CommitModel>();
  @Output() onHunkChangeError = new EventEmitter<any>();

  constructor(public settingsService: SettingsService,
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

  getHeaderTag(header: DiffModel) {
    if (header.toFilename == header.fromFilename) {
      if (header.hunks.every(x => x.fromNumLines == 0)) {
        return 'Added';
      } else if (header.hunks.every(x => x.toNumLines == 0)) {
        return 'Deleted';
      } else {
        return 'Changed';
      }
    } else if (header.fromFilename.substring(header.fromFilename.lastIndexOf('/')) == header.toFilename.substring(header.toFilename.lastIndexOf(
      '/'))) {
      return 'Moved';
    } else if (header.fromFilename.substring(0, header.fromFilename.lastIndexOf('/')) == header.toFilename.substring(0,
      header.toFilename.lastIndexOf('/'))) {
      return 'Renamed';
    }
  }

  saveSettings() {
    setTimeout(() => this.settingsService.saveSettings(), 100);
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
        .catch(error => this.onHunkChangeError.emit(error));
  }

  startEdit(hunk: DiffHunkModel, header: DiffModel) {
    this.editedText = this.getEditableCode(hunk);
    this.editingHeader = header;
    this.editingHunk = hunk;
  }

  isEditingHunk(hunk: DiffHunkModel, header: DiffModel) {
    return this.editingHunk && this.editingHeader && this.editingHunk.fromStartLine == hunk.fromStartLine && this.editingHeader.fromFilename == header.fromFilename;
  }
}
