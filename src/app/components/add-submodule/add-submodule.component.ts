import {ApplicationRef, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ModalService} from '../../services/modal.service';

@Component({
  selector: 'app-add-submodule',
  templateUrl: './add-submodule.component.html',
  styleUrls: ['./add-submodule.component.scss']
})
export class AddSubmoduleComponent implements OnInit {
  @Output() onAddClicked = new EventEmitter<{ url: string, path: string }>();
  showWindow = false;
  url: string;
  path: string;
  urlError: string;
  pathError: string;

  constructor(private modalService: ModalService, private applicationRef: ApplicationRef) {
    this.modalService.registerModal('addSubmodule').asObservable().subscribe(val => {
      this.showWindow = val;
      if (val) {
        this.path = '';
        this.url = '';
        this.pathError = '';
        this.urlError = '';
      }
      this.applicationRef.tick();
    });
  }

  ngOnInit() {
  }

  cancel() {
    this.modalService.setModalVisible('addSubmodule', false);
  }

  addSubmodule() {
    const valid = this.url.trim();
    if (!this.url.trim()) {
      this.pathError = 'Please enter a valid url';
    }
    if (valid) {
      this.modalService.setModalVisible('addSubmodule', false);
      this.onAddClicked.emit({url: this.url, path: this.path});
    }
  }
}
