import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import {
  CommitSummaryModel,
  TCommitGraphBlockTarget,
} from '../../../../shared/git/CommitSummary.model';
import { SettingsService } from '../../services/settings.service';

@Component({
    selector: 'app-git-graph-canvas',
    templateUrl: './git-graph-canvas.component.html',
    styleUrls: ['./git-graph-canvas.component.scss'],
    standalone: false
})
export class GitGraphCanvasComponent {
  spacerList: TCommitGraphBlockTarget[];
  @ViewChild('canvas') canvas: ElementRef;
  getCommitBranchColor = CommitSummaryModel.getCommitBranchColor;

  constructor(public settingsService: SettingsService) {}

  private _commit: CommitSummaryModel;

  get commit(): CommitSummaryModel {
    return this._commit;
  }

  @Input() set commit(value: CommitSummaryModel) {
    this._commit = value;
    this.spacerList = this.getSpacerList();
  }

  getCurvedPathDef(block: {
    target: number;
    source: number;
    isCommit: boolean;
    branchIndex: number;
    isMerge: boolean;
  }) {
    let source = this.getSafeHoriz(block.source);
    let target = this.getSafeHoriz(block.target);
    return `M${source} 25 C ${source} 12.5, ${target} 9, ${target} 0`;
  }

  getSpacerList() {
    let res = [];
    this._commit.graphBlockTargets.forEach((x) => {
      let isCommit = x.isCommit;
      let isMerge = x.isMerge;
      let branch = x.branchIndex;

      if (res[x.source]) {
        isCommit = isCommit || res[x.source].isCommit;
        isMerge = isMerge || res[x.source].isMerge;
        branch = res[x.source].branchIndex;
      }

      res[x.source] = Object.assign({}, x);
      res[x.source].isCommit = isCommit;
      res[x.source].isMerge = isMerge;
      res[x.source].branchIndex = branch;
    });
    return res;
  }

  getSpacerPathDef(spacer: any) {
    return `M${this.getSafeHoriz(spacer.source)} 25 L ${this.getSafeHoriz(
      spacer.source,
    )} 1000`;
  }

  getSafeHoriz(slot: number) {
    return slot * 14 + 8;
  }

  getSvgWidth() {
    return (
      this.getSafeHoriz(
        Math.max(
          ...this._commit.graphBlockTargets.map((x) =>
            Math.max(x.target, x.source),
          ),
        ) + 1,
      ) + 10
    );
  }
}
