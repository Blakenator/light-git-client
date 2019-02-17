import {Component, Input, OnInit, TemplateRef} from '@angular/core';
import {SettingsService} from '../../../services/settings.service';

@Component({
  selector: 'app-layout-card-header',
  templateUrl: './layout-card-header.component.html',
  styleUrls: ['./layout-card-header.component.scss'],
})
export class LayoutCardHeaderComponent implements OnInit {
  @Input() cardTitle: string;
  @Input() expandKey: string;
  @Input() iconClass: string;
  @Input() persistExpand: boolean;
  @Input() content: TemplateRef<any>;
  localExpanded = false;

  constructor(private settingsService: SettingsService) {
  }

  getExpandState() {
    return this.persistExpand ? this.settingsService.settings.expandStates[this.expandKey] : this.localExpanded;
  }

  ngOnInit() {
  }

  toggleExpandState($event: Event) {
    if (this.persistExpand) {
      let target = <Element>$event.target;
      if (target.className.split(' ').indexOf('clickable') > -1) {
        this.settingsService.settings.expandStates[this.expandKey] = !this.settingsService.settings.expandStates[this.expandKey];
        this.settingsService.saveSettings();
      }
    } else {
      this.localExpanded = !this.localExpanded;
    }
  }
}
