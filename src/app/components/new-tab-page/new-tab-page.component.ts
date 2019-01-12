import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ModalService} from '../../common/services/modal.service';

@Component({
  selector: 'app-new-tab-page',
  templateUrl: './new-tab-page.component.html',
  styleUrls: ['./new-tab-page.component.scss']
})
export class NewTabPageComponent implements OnInit {
  repoPath = '';
  @Output() onReady = new EventEmitter<string>();

  constructor(public modalService:ModalService) {
  }

  ngOnInit() {
  }

  readyClicked() {
    this.onReady.emit(this.repoPath.replace(/["']/g, ''));
  }
}
