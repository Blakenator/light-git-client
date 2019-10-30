import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ChangeType, LightChange} from '../../../../shared/git/Commit.model';
import {SettingsService} from '../../services/settings.service';
import {SubmoduleModel} from '../../../../shared/git/submodule.model';

@Component({
  selector: 'app-change-list',
  templateUrl: './change-list.component.html',
  styleUrls: ['./change-list.component.scss'],
})
export class ChangeListComponent implements OnInit {
  @Input() changeFilter = '';
  @Input() submodules: SubmoduleModel[];
  selectedChanges: { [key: string]: boolean } = {};
  @Output() onSelectChanged = new EventEmitter<{ [key: string]: boolean }>();
  @Output() onUndoFileClicked = new EventEmitter<string>();
  @Output() onUndoSubmoduleClicked = new EventEmitter<SubmoduleModel>();
  @Output() onMergeClicked = new EventEmitter<string>();
  @Output() onResolveClicked = new EventEmitter<{ file: string, theirs: boolean }>();
  @Output() onDeleteClicked = new EventEmitter<string[]>();
  selectAll = false;
  lastClicked: string;

  constructor(public settingsService: SettingsService) {
  }

  _changes: LightChange[];

  @Input() set changes(val: LightChange[]) {
    this._changes = val;
    this.updateSelection();
  }

  getChangeType(c: LightChange) {
    if (this.isSubmodule(c.file)) {
      return 'plug';
    }
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
    this.selectAll = !this.selectAll;
    for (let change of this._changes) {
      this.selectedChanges[change.file] = this.selectAll;
    }
    this.onSelectChanged.emit(this.selectedChanges);
  }

  undoFileClicked(file: string) {
    const submodule = this.isSubmodule(file);
    if (submodule) {
      this.onUndoSubmoduleClicked.emit(submodule);
    } else {
      this.onUndoFileClicked.emit(file.replace(/->.*/, ''));
      if (file.indexOf('->') > 0) {
        this.onDeleteClicked.emit([file.replace(/.*?->\s*/, '')]);
      }
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
      const lastClickedIndex = this._changes.findIndex(c => c.file == this.lastClicked);
      const thisClickedIndex = this._changes.findIndex(c => c.file == file);
      for (let c of this._changes.slice(
        Math.min(thisClickedIndex, lastClickedIndex),
        Math.max(thisClickedIndex, lastClickedIndex))) {
        this.selectedChanges[c.file] = true;
      }
    }
    this.lastClicked = file;
    this.selectAll = this._changes.every(x => this.selectedChanges[x.file]);
    this.onSelectChanged.emit(this.selectedChanges);
  }

  getSplitFilepath(file: any) {
    let res = file.replace('->', '/->/');
    if (this.settingsService.settings.splitFilenameDisplay) {
      res = res.substring(0, res.lastIndexOf('/'));
    }
    return res.split('/');
  }

  isSubmodule(currentPath: string) {
    return this.submodules.find(s => s.path == currentPath);
  }

  isDeleted(change: LightChange) {
    return this.getChangeType(change) == 'plus' || this.getChangeType(change) == 'question-circle';
  }

  shouldShowTrailingSlash(change: LightChange, index: number, part: string) {
    return index < change.file.replace('->', '/->/').split('/').length - 1 && part != '->' && change.file.replace(
      '->',
      '/->/').split('/')[index + 1] != '->';
  }

  private updateSelection() {
    let changes: { [key: string]: boolean } = {};
    this._changes.forEach(x => changes[x.file] = this.selectedChanges[x.file]);
    this.selectedChanges = changes;
  }
}
