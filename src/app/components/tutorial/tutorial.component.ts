import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.scss'],
})
export class TutorialComponent implements OnInit {
  @Input() top: number;
  @Input() left: number;

  constructor() {
  }

  ngOnInit() {
  }

}
