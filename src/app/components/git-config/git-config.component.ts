import {ApplicationRef, Component, OnInit} from '@angular/core';
import {GitService} from '../../services/git.service';
import {ConfigItemModel} from '../../../../shared/git/config-item.model';
import {ErrorService} from '../../common/services/error.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {ModalService} from '../../common/services/modal.service';

@Component({
  selector: 'app-git-config',
  templateUrl: './git-config.component.html',
  styleUrls: ['./git-config.component.scss'],
})
export class GitConfigComponent implements OnInit {
  isLoading = false;
  items: ConfigItemModel[] = [];
  currentEdit: ConfigItemModel;
  editedItem: ConfigItemModel;
  clickedKey = true;
  filter: string;

  constructor(private gitService: GitService,
              private errorService: ErrorService,
              private modalService: ModalService,
              private applicationRef: ApplicationRef) {
  }

  ngOnInit() {
  }

  show() {
    this.modalService.setModalVisible('gitConfig', true);
    this.isLoading = true;
    this.gitService.getConfigItems()
        .then(items => this.handleItemsUpdate(items))
        .catch(error => this.errorService.receiveError(
          new ErrorModel(
            'Git config component, getConfigItems',
            'getting config items',
            error)));
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
    this.clickedKey = true;
  }

  startEdit(item: ConfigItemModel, clickedKey: boolean) {
    this.clickedKey = clickedKey;
    this.editedItem = Object.assign({}, item);
    this.currentEdit = this.editedItem;
  }

  close() {
    this.modalService.setModalVisible('gitConfig', false);
    this.currentEdit = undefined;
  }

  deleteConfigItem(item: ConfigItemModel) {
    if (item.sourceFile) {
      this.editedItem = Object.assign({}, item, {value: ''});
      this.doSaveItem(item);
    } else {
      this.items.splice(this.items.indexOf(item), 1);
    }
  }

  saveConfigItem(originalItem: ConfigItemModel, rename?: ConfigItemModel) {
    if (!this.editedItem ||
      !(this.editedItem.key || '').trim() ||
      !this.currentEdit ||
      ((!this.clickedKey && this.editedItem.value == originalItem.value) || (this.clickedKey && this.editedItem.key == originalItem.key)) ||
      (!this.currentEdit.sourceFile && !this.currentEdit.value)) {
      return;
    }
    this.currentEdit = undefined;
    this.doSaveItem(originalItem, rename);
  }

  isEditing(item: ConfigItemModel) {
    return this.currentEdit && this.currentEdit.sourceFile == item.sourceFile && this.currentEdit.key == item.key;
  }

  cancelEdit() {
    this.currentEdit = undefined;
  }

  getConfigFileDisplay(sourceFile: string) {
    return sourceFile.replace(/^.*?:/, '').replace(/['"]/g, '').replace(/\\\\/g, '\\');
  }

  nextTabRow(item: ConfigItemModel) {
    if (!item.sourceFile) {
      setTimeout(() => {
        this.newItem();
        this.applicationRef.tick();
      }, 100);
    }
  }

  private doSaveItem(originalItem: ConfigItemModel, rename?: ConfigItemModel) {
    this.gitService.setConfigItem(this.editedItem, rename)
        .then(items => this.handleItemsUpdate(items))
        .catch(error => {
          if (!this.editedItem.sourceFile) {
            this.items.pop();
          }
          this.editedItem = originalItem;
          this.errorService.receiveError(
            new ErrorModel(
              'Git config component, setConfigItem',
              'setting the config item',
              error || 'the section or key is invalid'));
        });
  }

  private handleItemsUpdate(items) {
    this.items = items;
    this.isLoading = false;
    this.applicationRef.tick();
  }
}
