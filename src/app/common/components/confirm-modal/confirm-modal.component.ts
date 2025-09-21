import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'app-confirm-modal',
    templateUrl: './confirm-modal.component.html',
    styleUrls: ['./confirm-modal.component.scss'],
    standalone: false
})
export class ConfirmModalComponent {
  @Input() confirmText = 'Confirm';
  @Input() modalTitle: string;
  @Input() modalId: string;
  @Input() modalClass: string = '';
  @Input() confirmDisabled: string;
  @Output() onConfirm = new EventEmitter();

  constructor() {}
}
