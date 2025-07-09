import {Component} from '@angular/core';
import {NgbTooltipConfig} from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
    constructor(config: NgbTooltipConfig) {
        config.openDelay = 500;

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
