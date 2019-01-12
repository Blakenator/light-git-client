import {ApplicationRef, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {Observable} from 'rxjs';
import {GitService} from '../../services/git.service';
import {ModalService} from '../../common/services/modal.service';

@Component({
  selector: 'app-clone',
  templateUrl: './clone.component.html',
  styleUrls: ['./clone.component.scss']
})
export class CloneComponent implements OnInit {
  showWindow: Observable<boolean>;
  url = '';
  path = '';
  @Output() onCloneComplete = new EventEmitter<string>();
  output: { err: string, out: string, done: boolean }[] = [];
  isLoading = false;

  constructor(private gitService: GitService, private applicationRef: ApplicationRef, public modalService: ModalService) {
    this.showWindow = modalService.registerModal('clone').asObservable();
  }

  ngOnInit() {
  }

  doClone() {
    if (!this.path || !this.path.trim() || !this.url || !this.url.trim()) {
      return;
    }
    this.isLoading = true;
    this.output = [];
    this.gitService.clone(this.path, this.url, (out, err, done) => {
      this.output.push({out, err, done});
      if (done && this.output.filter(x => x.done && !!x.err).length == 0) {
        this.modalService.setModalVisible('clone', false);
        this.onCloneComplete.emit(this.path);
      }
      if (done) {
        this.isLoading = false;
      }
      this.applicationRef.tick();
    });
  }

  cancel() {
    this.modalService.setModalVisible('clone', false);
    this.url = '';
    this.path = '';
  }
}
