import {Component, ElementRef, Input, OnInit, TemplateRef} from '@angular/core';
import {SettingsService} from '../../../services/settings.service';

@Component({
  selector: 'app-layout-card-header',
  templateUrl: './layout-card-header.component.html',
  styleUrls: ['./layout-card-header.component.scss'],
})
export class LayoutCardHeaderComponent implements OnInit {
  @Input() title: string;
  @Input() expandKey: string;
  @Input() iconClass: string;
  @Input() content: TemplateRef<any>;

  constructor(private settingsService: SettingsService) {
  }

  getExpandState() {
    return this.settingsService.settings.expandStates[this.expandKey];
  }

  ngOnInit() {
  }

  toggleExpandState($event: Event) {
    let target = <Element>$event.target;
    if (target.className.split(' ').indexOf('clickable') > -1) {
      this.settingsService.settings.expandStates[this.expandKey] = !this.settingsService.settings.expandStates[this.expandKey];
      this.settingsService.saveSettings();
    }
  }
}
