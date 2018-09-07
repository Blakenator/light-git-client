import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ChangeType, LightChange} from '../../../../shared/Commit.model';

@Component({
  selector: 'app-change-list',
  templateUrl: './change-list.component.html',
  styleUrls: ['./change-list.component.scss']
})
export class ChangeListComponent implements OnInit {
  @Input() changes: LightChange[];
  @Input() changeFilter = '';
  @Input() selectedChanges: { [key: string]: boolean } = {};
  @Output() onSelectChanged = new EventEmitter<any>();
  @Output() onUndoFileClicked = new EventEmitter<string>();
  @Output() onMergeClicked = new EventEmitter<string>();
  @Output() onDeleteClicked = new EventEmitter<string[]>();
  selectAll = false;
  lastClicked: string;

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

  getChangeTypeDescription(c: LightChange) {
    switch (c.change) {
      case ChangeType.Untracked:
        return 'Untracked';
      case ChangeType.Addition:
        return 'Addition';
      case ChangeType.Deletion:
        return 'Deletion';
      case ChangeType.MergeConflict:
        return 'Merge Conflict';
      case ChangeType.Rename:
        return 'Rename';
      case ChangeType.Modified:
      default:
        return 'Changed';
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
    this.onUndoFileClicked.emit(file.replace(/->.*/, ''));
    if (file.indexOf('->') > 0) {
      this.onDeleteClicked.emit([file.replace(/.*?->\s*/, '')]);
    }
  }

  mergeClicked(file: string) {
    this.onMergeClicked.emit(file.replace(/.*->\s*/, ''));
  }

  isMergeConflict(change: ChangeType) {
    return change == ChangeType.MergeConflict;
  }

  deleteClicked(file: string) {
    this.onDeleteClicked.emit([file.replace(/.*->\s*/, '')]);
  }

  toggleSelect(file: string, $event: MouseEvent) {
    this.selectedChanges[file] = !this.selectedChanges[file];
    if ($event.shiftKey) {
      const lastClickedIndex = this.changes.findIndex(c => c.file == this.lastClicked);
      const thisClickedIndex = this.changes.findIndex(c => c.file == file);
      for (let c of this.changes.slice(Math.min(thisClickedIndex, lastClickedIndex),
        Math.max(thisClickedIndex, lastClickedIndex))) {
        this.selectedChanges[c.file] = true;
      }
    }
    this.lastClicked = file;
    this.selectAll = this.changes.every(x => this.selectedChanges[x.file]);
    this.onSelectChanged.emit();
  }
}
