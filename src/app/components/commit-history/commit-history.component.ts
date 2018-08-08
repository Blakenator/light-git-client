import {Component, Input, OnInit} from '@angular/core';
import {CommitSummaryModel} from "../../../../shared/CommitSummary.model";

@Component({
  selector: 'app-commit-history',
  templateUrl: './commit-history.component.html',
  styleUrls: ['./commit-history.component.scss']
})
export class CommitHistoryComponent implements OnInit {
  @Input() commitHistory: CommitSummaryModel[];

  constructor() {
  }

  ngOnInit() {
  }

}
