import {Component} from '@angular/core';
import {ElectronService} from './common/services/electron.service';
import {TranslateService} from '@ngx-translate/core';
import {NgbTooltipConfig} from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    constructor(public electronService: ElectronService,
                private translate: TranslateService,
                config: NgbTooltipConfig) {
        config.openDelay = 500;
        translate.setDefaultLang('en');

        document.onkeydown = function (event) {
            if (event.ctrlKey || event.metaKey) {
                if (event.key == 'v') {
                    document.execCommand('paste');
                    return false;
                    event.preventDefault();
                    event.stopPropagation();
                }
                if (event.key == 'c') {
                    document.execCommand('copy');
                    return false;
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        };
    }
}
