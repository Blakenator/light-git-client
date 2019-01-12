import {ApplicationRef, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ModalService} from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent implements OnInit {
  show = false;
  render = false;
  @Output() onCancel = new EventEmitter();
  @Output() onOpen = new EventEmitter();
  @Output() onFinish = new EventEmitter<string>();
  @Input() modalTitleIcon = '';
  @Input() modalClass = '';
  @Input() leaveOpen = false;
  @Input() customModal = false;
  @Input() hasAffirmative = true;
  @Input() hasNegative = true;
  @Input() modalTitle: string;
  @Input() modalId: string;
  @Input() affirmativeButtonText = 'Ok';
  @Input() affirmativeButtonDisabled = false;
  @Input() negativeButtonText = 'Cancel';

  constructor(private modalService: ModalService, private applicationRef: ApplicationRef) {
  }

  ngOnInit() {
    this.modalService.registerModal(this.modalId).subscribe(visible => {
      this.setVisible(visible);
    });
  }

  setVisible(val: boolean) {
    if (val) {
      setTimeout(() => {
        this.show = true;
        this.applicationRef.tick();
      }, 100);
      this.render = true;
    } else {
      this.show = false;
      setTimeout(() => {
        this.render = false;
        this.applicationRef.tick();
      }, 300);
    }
  }

  accept() {
    if (!this.leaveOpen) {
      this.setVisible(false);
    }
    this.onFinish.emit();
  }

  cancel() {
    this.setVisible(false);
    this.onCancel.emit();
  }
}
