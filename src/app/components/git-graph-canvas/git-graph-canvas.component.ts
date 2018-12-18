import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {CommitSummaryModel} from '../../../../shared/git/CommitSummary.model';

@Component({
  selector: 'app-git-graph-canvas',
  templateUrl: './git-graph-canvas.component.html',
  styleUrls: ['./git-graph-canvas.component.scss'],
})
export class GitGraphCanvasComponent implements OnInit {
  @Input() commit: CommitSummaryModel;
  @ViewChild('canvas') canvas: ElementRef;

  constructor() {
  }

  ngOnInit() {
    setTimeout(() => {
      this.drawConnectors();
    }, 100);
  }

  private drawConnectors() {
    let ctx: CanvasRenderingContext2D = this.canvas.nativeElement.getContext('2d');
    for (let i = 0; i < this.commit.graphBlockTargets.length; i++) {
      let block = this.commit.graphBlockTargets[i];
      if (block.target >= 0) {
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(block.source * 25 + 14, 25);
        ctx.lineTo(block.target * 25 + 14, 0);

        ctx.strokeStyle = CommitSummaryModel.getCommitBranchColor(block.branchIndex);

        ctx.stroke();
      }
    }
  }
}
