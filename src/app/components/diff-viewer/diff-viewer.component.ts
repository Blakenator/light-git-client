import {Component, Input, OnInit} from '@angular/core';
import {CommitSummaryModel} from "../../../../shared/CommitSummary.model";

declare var Diff2Html;

@Component({
  selector: 'app-diff-viewer',
  templateUrl: './diff-viewer.component.html',
  styleUrls: ['./diff-viewer.component.scss']
})
export class DiffViewerComponent implements OnInit {
  @Input() diffString: string;
  @Input() diffCommitInfo: CommitSummaryModel;
  matchingSelection = "words";

  constructor() {
  }

  ngOnInit() {
  }

  getDiffHtml() {
    return Diff2Html.getPrettyHtml(this.diffString, {
      inputFormat: 'diff',
      matching: this.matchingSelection
    })
      .replace(/<span class=\"d2h-code-line-prefix\">.<\/span>/g, "");
  }
}
