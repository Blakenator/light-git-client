import {Component, ElementRef, Input, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {LayoutCardHeaderComponent} from './layout-card-header/layout-card-header.component';

@Component({
  selector: 'app-layout-card',
  templateUrl: './layout-card.component.html',
  styleUrls: ['./layout-card.component.scss'],
})
export class LayoutCardComponent implements OnInit {
  @ViewChild(LayoutCardHeaderComponent) header: LayoutCardHeaderComponent;
  @Input() customBodyClass = '';
  @Input() cardTitle: string;
  @Input() expandKey: string;
  @Input() iconClass: string;
  @Input() persistExpand = true;
  @Input() spaced = true;
  @Input() headerContent: TemplateRef<any>;

  constructor() {
  }

  ngOnInit() {
  }
}
