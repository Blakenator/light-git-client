import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-tutorial',
    templateUrl: './tutorial.component.html',
    styleUrls: ['./tutorial.component.scss'],
    standalone: false
})
export class TutorialComponent {
  @Input() top: number;
  @Input() left: number;

  constructor() {}
}
