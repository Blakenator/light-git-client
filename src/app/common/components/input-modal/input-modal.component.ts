import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalService } from '../../services/modal.service';

@Component({
    selector: 'app-input-modal',
    templateUrl: './input-modal.component.html',
    styleUrls: ['./input-modal.component.scss'],
    standalone: false
})
export class InputModalComponent {
  @Input() modalTitle = '';
  @Input() modalId;
  @Input() message = '';
  @Input() replaceChars: { match: RegExp; with: string };
  @Input() uidSalt: string | number = '';
  @Input() inputPlaceholder = '';
  @Input() inputPrepend = '';
  @Input() validPattern = '';
  @Input() invalidMessage = '';
  @Input() defaultText = '';
  @Input() showPrependClearButton = false;
  @Output() onClickOk = new EventEmitter<string>();
  @Output() onClickCancel = new EventEmitter<string>();
  @Output() onPrependClear = new EventEmitter<void>();
  value: string;
  errorMessage: string;

  constructor(public modalService: ModalService) {
    this.value = this.defaultText;
  }

  okClicked() {
    if (this.value.match(this.validPattern)) {
      this.onClickOk.emit(this.value);
      this.errorMessage = '';
      this.modalService.setModalVisible(this.modalId + this.uidSalt, false);
    } else {
      this.errorMessage = this.invalidMessage;
    }
  }

  private _showPrefix = true;

  get showInputPrepend() {
    return this.inputPrepend && this._showPrefix;
  }

  clearInputPrepend() {
    this._showPrefix = false;
    this.onPrependClear.emit();
  }

  checkValid() {
    if (this.replaceChars) {
      this.value = this.value.replace(
        this.replaceChars.match,
        this.replaceChars.with,
      );
    }
    if (!this.value.match(this.validPattern)) {
      this.errorMessage = this.invalidMessage;
      return false;
    } else {
      this.errorMessage = '';
      return true;
    }
  }
}
