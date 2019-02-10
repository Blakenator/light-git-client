import {Component} from '@angular/core';
import {ElectronService} from './common/services/electron.service';
import {TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public electronService: ElectronService,
              private translate: TranslateService) {

    translate.setDefaultLang('en');

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
