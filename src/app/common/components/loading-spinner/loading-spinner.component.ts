import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-loading-spinner',
    templateUrl: './loading-spinner.component.html',
    styleUrls: ['./loading-spinner.component.scss'],
    standalone: false
})
export class LoadingSpinnerComponent {
  @Input() show: boolean;
  @Input() keepSpacing = false;

  constructor() {}
}
