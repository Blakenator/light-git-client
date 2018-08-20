import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-input-modal',
  templateUrl: './input-modal.component.html',
  styleUrls: ['./input-modal.component.scss']
})
export class InputModalComponent implements OnInit {
  @Input() modalTitle = '';
  @Input() message = '';
  @Input() inputPlaceholder = '';
  @Input() validPattern = '';
  @Input() invalidMessage = '';
  @Input() defaultText = '';
  @Output() onClickOk = new EventEmitter<string>();
  @Output() onClickCancel = new EventEmitter<string>();
  value: string;
  errorMessage: string;

  constructor() {
  }

  _show = false;

  @Input() set show(val: boolean) {
    this._show = val;
    this.value = this.defaultText;
    this.errorMessage = '';
  }

  ngOnInit() {
  }

  okClicked() {
    if (this.value.match(this.validPattern)) {
      this.onClickOk.emit(this.value);
      this.show = false;
      this.errorMessage = '';
    } else {
      this.errorMessage = this.invalidMessage;
    }
  }

  cancelClicked() {
    this.onClickCancel.emit(this.value);
    this.show = false;
  }

  checkValid() {
    if (!this.value.match(this.validPattern)) {
      this.errorMessage = this.invalidMessage;
    } else {
      this.errorMessage = '';
    }
  }
}
