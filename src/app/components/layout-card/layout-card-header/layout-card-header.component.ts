import {Component, EventEmitter, Input, OnInit, Output, TemplateRef} from '@angular/core';
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
  @Input() localExpandedDefault = true;
  @Output() onToggleExpand = new EventEmitter<boolean>();
  localExpanded = false;

  constructor(private settingsService: SettingsService) {
  }

  getExpandState() {
    return this.persistExpand ? this.settingsService.settings.expandStates[this.expandKey] : this.localExpanded;
  }

  ngOnInit() {
    this.localExpanded = this.localExpandedDefault;
  }

  toggleExpandState($event: Event) {
    if (this.persistExpand) {
      let target = <Element>$event.target;
      if (target.className.split(' ').indexOf('clickable') > -1) {
        this.settingsService.settings.expandStates[this.expandKey] = !this.settingsService.settings.expandStates[this.expandKey];
        this.settingsService.saveSettings();
        this.onToggleExpand.emit(this.settingsService.settings.expandStates[this.expandKey]);
      }
    } else {
      this.localExpanded = !this.localExpanded;
      this.onToggleExpand.emit(this.localExpanded);
    }
  }
}
