import {
  ApplicationRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ModalService } from '../../common/services/modal.service';

@Component({
    selector: 'app-add-submodule',
    templateUrl: './add-submodule.component.html',
    styleUrls: ['./add-submodule.component.scss'],
    standalone: false
})
export class AddSubmoduleComponent {
  @Input() uidSalt = '';
  @Output() onAddClicked = new EventEmitter<{ url: string; path: string }>();
  url: string;
  path: string;
  urlError: string;
  pathError: string;

  constructor(
    private modalService: ModalService,
    private applicationRef: ApplicationRef,
  ) {}

  addSubmodule() {
    const valid = this.url.trim();
    if (!this.url.trim()) {
      this.pathError = 'Please enter a valid url';
      this.applicationRef.tick();
    }
    if (valid) {
      this.modalService.setModalVisible('addSubmodule' + this.uidSalt, false);
      this.onAddClicked.emit({ url: this.url, path: this.path });
    }
  }

  resetFields() {
    this.path = '';
    this.url = '';
    this.pathError = '';
    this.urlError = '';
  }
}
