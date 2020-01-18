import {Component, Input, OnInit} from '@angular/core';
import {SettingsModel} from '../../../../../shared/SettingsModel';
import {CodeWatcherModel} from '../../../../../shared/code-watcher.model';
import {ModalService} from '../../../common/services/modal.service';
import {TabDataService} from '../../../services/tab-data.service';

@Component({
  selector: 'app-code-watcher-config',
  templateUrl: './code-watcher-config.component.html',
  styleUrls: ['./code-watcher-config.component.scss'],
})
export class CodeWatcherConfigComponent implements OnInit {
  @Input() tempSettings: SettingsModel;
  confirmDeletePath: string;

  constructor(private modalService: ModalService) {
  }

  ngOnInit() {
  }

  addWatcher(filename: string) {
    const model = new CodeWatcherModel();
    model.activeFilter = filename;
    if (this.tempSettings.loadedCodeWatchers.length) {
      model.path = this.tempSettings.loadedCodeWatchers[0].path;
    }
    this.tempSettings.loadedCodeWatchers.push(model);
  }

  getFilenames() {
    let files: { [key: string]: boolean } = {};
    this.tempSettings.loadedCodeWatchers.forEach(w => files[w.activeFilter] = true);
    let result = Object.keys(files) || [];
    if (result.indexOf('') < 0) {
      result = [''].concat(result);
    }
    result = result.sort();
    return result;
  }

  getWatchersInGroup(filename: string) {
    return this.tempSettings.loadedCodeWatchers.filter(w => w.activeFilter == filename);
  }

  copyWatcher(w: CodeWatcherModel) {
    let index = this.tempSettings.loadedCodeWatchers.indexOf(w);
    this.tempSettings.loadedCodeWatchers = this.tempSettings.loadedCodeWatchers.slice(0, index)
                                               .concat([Object.assign(new CodeWatcherModel(), w)])
                                               .concat(this.tempSettings.loadedCodeWatchers.slice(index));
  }

  changeFilename(orig: string, to: string) {
    this.tempSettings.loadedCodeWatchers.filter(w => w.activeFilter == orig).forEach(w => w.activeFilter = to);
  }

  deleteWatcher(w: CodeWatcherModel) {
    this.tempSettings.loadedCodeWatchers.splice(this.tempSettings.loadedCodeWatchers.indexOf(w), 1);
  }

  deleteWatcherFile(toRemove: string) {
    if (this.getWatcherCountInFile(toRemove) > 0) {
      this.confirmDeletePath = toRemove;
      this.modalService.setModalVisible('confirmDeleteWatcherFile', true);
    } else {
      this.doDeleteWatcherFile(toRemove);
    }
  }

  doDeleteWatcherFile(toRemove: string) {
    this.tempSettings.codeWatcherPaths.splice(this.tempSettings.codeWatcherPaths.indexOf(toRemove), 1);
    this.tempSettings.loadedCodeWatchers = this.tempSettings.loadedCodeWatchers.filter(w => w.path != toRemove);
    this.confirmDeletePath = undefined;
  }

  getWatcherCountInFile(path: string) {
    return this.tempSettings.loadedCodeWatchers.filter(w => w.path == path).length;
  }

  getDropdownLabelText(w: CodeWatcherModel) {
    return TabDataService.basename(w.path);
  }
}
