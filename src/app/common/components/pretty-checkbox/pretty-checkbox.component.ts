import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-pretty-checkbox',
  templateUrl: './pretty-checkbox.component.html',
  styleUrls: ['./pretty-checkbox.component.scss'],
})
export class PrettyCheckboxComponent implements OnInit {
  @Input() value: boolean;
  @Output() valueChange = new EventEmitter<boolean>();

  constructor() {
  }

  ngOnInit() {
  }

}
