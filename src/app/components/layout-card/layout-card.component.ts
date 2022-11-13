import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { LayoutCardHeaderComponent } from './layout-card-header/layout-card-header.component';
import { Animations } from '../../common/animations';

@Component({
  selector: 'app-layout-card',
  templateUrl: './layout-card.component.html',
  styleUrls: ['./layout-card.component.scss'],
  animations: [Animations.growHeightIn, Animations.inOut],
})
export class LayoutCardComponent implements OnInit {
  @ViewChild(LayoutCardHeaderComponent, { static: true })
  header: LayoutCardHeaderComponent;
  @Input() customBodyClass = '';
  @Input() customHeaderClass = '';
  @Input() cardTitle: string;
  @Input() expandKey: string;
  @Input() iconClass: string;
  @Input() persistExpand = true;
  @Input() localExpandedDefault = true;
  @Input() spaced = false;
  @Input() preventOverflow = false;
  @Input() headerContent: TemplateRef<any>;
  @Input() infiniteScrollDisabled = true;
  @Output() scrolled = new EventEmitter();
  @Output() scrolledUp = new EventEmitter();
  @HostBinding('class.flex-grow-1') flexGrowClass = false;
  @HostBinding('class.min-height') flexMinHeightClass = true;
  @HostBinding('class.d-flex') flexBinding = true;
  @HostBinding('class.flex-column') flexColumnBinding = true;

  ngOnInit() {
    setTimeout(() => {
      this.updateFlexBindings(this.header.getExpandState());
    }, 50);
  }

  updateFlexBindings(expanded: boolean) {
    this.flexGrowClass = expanded;
    this.flexMinHeightClass = !expanded;
  }
}
