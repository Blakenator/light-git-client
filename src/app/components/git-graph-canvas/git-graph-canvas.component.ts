import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/git/CommitSummary.model';
import {SettingsService} from '../../services/settings.service';

@Component({
  selector: 'app-git-graph-canvas',
  templateUrl: './git-graph-canvas.component.html',
  styleUrls: ['./git-graph-canvas.component.scss'],
})
export class GitGraphCanvasComponent implements OnInit {
  @Input() commit: CommitSummaryModel;
  @ViewChild('canvas') canvas: ElementRef;
  getCommitBranchColor = CommitSummaryModel.getCommitBranchColor;

  constructor(public settingsService: SettingsService) {
  }

  ngOnInit() {
    // setTimeout(() => {
    //   this.drawConnectors();
    // }, 100);
  }

  drawConnectors() {
    let ctx: CanvasRenderingContext2D = this.canvas.nativeElement.getContext('2d');
    for (let i = 0; i < this.commit.graphBlockTargets.length; i++) {
      let block = this.commit.graphBlockTargets[i];
      if (block.target >= 0) {
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(block.source * 14 + 8, 25);
        ctx.bezierCurveTo(block.source * 14 + 8, 12.5, block.target * 14 + 8, 12.5, block.target * 14 + 8, 0);

        ctx.strokeStyle = CommitSummaryModel.getCommitBranchColor(block.branchIndex);

        ctx.stroke();
      }
    }
  }

  getSvgDef(block: { target: number; source: number; isCommit: boolean; branchIndex: number; isMerge: boolean }) {
    let source = this.getSafeHoriz(block.source);
    let target = this.getSafeHoriz(block.target);
    return `M${source} 25 C ${source} 12.5, ${target} 12.5, ${target} 0`;
  }

  getSpacerList(c: CommitSummaryModel) {
    let res = [];
    c.graphBlockTargets.forEach(x => {
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
    return `M${this.getSafeHoriz(spacer.source)} 25 L ${this.getSafeHoriz(spacer.source)} 1000`;
  }

  getSafeHoriz(slot: number) {
    return slot * 14 + 8;
  }

  getSvgWidth() {
    return this.getSafeHoriz(Math.max(...this.commit.graphBlockTargets.map(x => Math.max(x.target, x.source)))+1);
  }
}
