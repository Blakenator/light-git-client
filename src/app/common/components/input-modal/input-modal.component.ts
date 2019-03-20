import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ModalService} from '../../services/modal.service';

@Component({
  selector: 'app-input-modal',
  templateUrl: './input-modal.component.html',
  styleUrls: ['./input-modal.component.scss'],
})
export class InputModalComponent implements OnInit {
  @Input() modalTitle = '';
  @Input() modalId;
  @Input() message = '';
  @Input() replaceChars: { match: RegExp, with: string };
  @Input() uidSalt = '';
  @Input() inputPlaceholder = '';
  @Input() validPattern = '';
  @Input() invalidMessage = '';
  @Input() defaultText = '';
  @Output() onClickOk = new EventEmitter<string>();
  @Output() onClickCancel = new EventEmitter<string>();
  value: string;
  errorMessage: string;

  constructor(private modalService: ModalService) {
    this.value = this.defaultText;
  }

  ngOnInit() {
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

  checkValid() {
    if (this.replaceChars) {
      this.value = this.value.replace(this.replaceChars.match, this.replaceChars.with);
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
