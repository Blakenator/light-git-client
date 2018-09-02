import {ApplicationRef, Component, OnInit} from '@angular/core';
import {GitService} from '../../providers/git.service';
import {ConfigItemModel} from '../../../../shared/config-item.model';

@Component({
  selector: 'app-git-config',
  templateUrl: './git-config.component.html',
  styleUrls: ['./git-config.component.scss']
})
export class GitConfigComponent implements OnInit {
  showWindow = false;
  isLoading = false;
  items: ConfigItemModel[] = [];
  errorMessage: { error: string };
  currentEdit: ConfigItemModel;
  editedItem: ConfigItemModel;
  clickedKey = true;
  filter: string;

  constructor(private gitService: GitService,
              private applicationRef: ApplicationRef) {
  }

  ngOnInit() {
  }

  show() {
    this.showWindow = true;
    this.isLoading = true;
    this.gitService.getConfigItems()
        .then(items => this.handleItemsUpdate(items))
        .catch(error => this.handleErrorMessage(error));
  }

  newItem() {
    let index = 0;
    while (this.items.find(x => x.key == 'newKey' + index)) {
      index++;
    }
    const newKey = 'newKey' + index;
    this.editedItem = new ConfigItemModel(newKey, 'newValue');
    this.items.push(this.editedItem);
    this.currentEdit = this.editedItem;
  }

  startEdit(item: ConfigItemModel, clickedKey: boolean) {
    this.clickedKey = clickedKey;
    this.editedItem = Object.assign({}, item);
    this.currentEdit = this.editedItem;
  }

  close() {
    this.showWindow = false;
    this.currentEdit = undefined;
  }

  saveConfigItem(rename?: ConfigItemModel) {
    if (!this.editedItem || !(this.editedItem.key || '').trim() || !this.currentEdit) {
      return;
    }
    this.currentEdit = undefined;
    this.gitService.setConfigItem(this.editedItem, rename)
        .then(items => this.handleItemsUpdate(items))
        .catch(error => this.handleErrorMessage(error));
  }

  isEditing(item: ConfigItemModel) {
    return this.currentEdit && this.currentEdit.sourceFile == item.sourceFile && this.currentEdit.key == item.key;
  }

  cancelEdit() {
    this.currentEdit = undefined;
  }

  getConfigFileDisplay(sourceFile: string) {
    return sourceFile.replace(/^.*?:/, '').replace(/['"]/g, '').replace(/\\\\/g,'\\');
  }

  private handleItemsUpdate(items) {
    this.items = items;
    this.isLoading = false;
    this.applicationRef.tick();
  }

  private handleErrorMessage(content: string) {
    this.errorMessage = {error: content};
    this.isLoading = false;
  }
}
