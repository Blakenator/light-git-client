import {Component} from '@angular/core';
import {ElectronService} from './services/electron.service';
import {TranslateService} from '@ngx-translate/core';
import {AppConfig} from '../environments/environment';

// import {clipboard} from 'electron';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public electronService: ElectronService,
              private translate: TranslateService) {

    translate.setDefaultLang('en');
    console.log('AppConfig', AppConfig);

    if (electronService.isElectron()) {
      console.log('Mode electron');
      console.log('Electron ipcRenderer', electronService.ipcRenderer);
      console.log('NodeJS childProcess', electronService.childProcess);
    } else {
      console.log('Mode web');
    }

    document.onkeydown = function (event) {
      let toReturn = true;
      if (event.ctrlKey || event.metaKey) {
        if (event.key == 'v') {
          document.execCommand('paste');
          toReturn = false;
          event.preventDefault();
          event.stopPropagation();
        }
      }

      return toReturn;
    };
  }
}
