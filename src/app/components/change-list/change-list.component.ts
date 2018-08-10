import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ChangeType, LightChange} from "../../../../shared/Commit.model";

@Component({
  selector: 'app-change-list',
  templateUrl: './change-list.component.html',
  styleUrls: ['./change-list.component.scss']
})
export class ChangeListComponent implements OnInit {
  @Input() changes: LightChange[];
  @Input() selectedChanges: { [key: string]: boolean } = {};
  @Output() onSelectChanged = new EventEmitter<any>();
  @Output() onUndoFileClicked = new EventEmitter<string>();
  @Output() onMergeClicked = new EventEmitter<string>();
  @Output() onDeleteClicked = new EventEmitter<string[]>();

  selectAll = false;

  constructor() {
  }

  getChangeType(c: LightChange) {
    switch (c.change) {
      case ChangeType.Untracked:
        return 'question-circle';
      case ChangeType.Addition:
        return 'plus';
      case ChangeType.Deletion:
        return 'minus';
      case ChangeType.MergeConflict:
        return 'exclamation-triangle';
      case ChangeType.Rename:
        return 'registered';
      case ChangeType.Modified:
      default:
        return 'pen-square';
    }
  }

  ngOnInit() {
  }

  toggleSelectAll() {
    for (let change of this.changes) {
      this.selectedChanges[change.file] = this.selectAll;
    }
    this.onSelectChanged.emit();
  }

  undoFileClicked(file: string) {
    this.onUndoFileClicked.emit(file);
  }

  mergeClicked(file: string) {
    this.onMergeClicked.emit(file);
  }

  isMergeConflict(change: ChangeType) {
    return change == ChangeType.MergeConflict;
  }

  deleteClicked(file: string) {
    this.onDeleteClicked.emit([file]);
  }

  toggleSelect(file: string) {
    this.selectedChanges[file] = !this.selectedChanges[file];
    this.onSelectChanged.emit();
  }
}
