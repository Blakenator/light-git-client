import {Component, Input, OnInit} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/CommitSummary.model';
import {DiffHunkModel, DiffLineModel, DiffModel, LineState} from '../../../../shared/diff.model';

@Component({
  selector: 'app-diff-viewer',
  templateUrl: './diff-viewer.component.html',
  styleUrls: ['./diff-viewer.component.scss']
})
export class DiffViewerComponent implements OnInit {
  @Input() diffHeaders: DiffModel[];
  @Input() diffCommitInfo: CommitSummaryModel;
  matchingSelection = 'words';

  constructor() {
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
}
