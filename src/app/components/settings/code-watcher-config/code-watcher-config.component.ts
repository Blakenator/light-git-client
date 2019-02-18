import {Component, Input, OnInit} from '@angular/core';
import {SettingsModel} from '../../../../../shared/SettingsModel';
import {CodeWatcherModel} from '../../../../../shared/code-watcher.model';

@Component({
  selector: 'app-code-watcher-config',
  templateUrl: './code-watcher-config.component.html',
  styleUrls: ['./code-watcher-config.component.scss']
})
export class CodeWatcherConfigComponent implements OnInit {
  @Input() tempSettings: SettingsModel;

  constructor() {
  }

  ngOnInit() {
  }

  addWatcher(filename: string) {
    const model = new CodeWatcherModel();
    model.activeFilter = filename;
    this.tempSettings.codeWatchers.push(model);
  }

  getFilenames() {
    let files: { [key: string]: boolean } = {};
    this.tempSettings.codeWatchers.forEach(w => files[w.activeFilter] = true);
    let result = Object.keys(files) || [];
    if (result.indexOf('') < 0) {
      result = [''].concat(result);
    }
    result = result.sort();
    return result;
  }

  getWatchersInGroup(filename: string) {
    return this.tempSettings.codeWatchers.filter(w => w.activeFilter == filename);
  }

  copyWatcher(w: CodeWatcherModel) {
    let index = this.tempSettings.codeWatchers.indexOf(w);
    this.tempSettings.codeWatchers = this.tempSettings.codeWatchers.slice(0, index + 1)
                                         .concat(this.tempSettings.codeWatchers.slice(index));
  }

  changeFilename(orig: string, to: string) {
    this.tempSettings.codeWatchers.filter(w => w.activeFilter == orig).forEach(w => w.activeFilter = to);
  }

  deleteWatchet(w: CodeWatcherModel) {
    this.tempSettings.codeWatchers.splice(this.tempSettings.codeWatchers.indexOf(w), 1);
  }
}
