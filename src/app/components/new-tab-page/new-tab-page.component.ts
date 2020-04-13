import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ModalService } from '../../common/services/modal.service';
import { dialog } from 'electron';

@Component({
  selector: 'app-new-tab-page',
  templateUrl: './new-tab-page.component.html',
  styleUrls: ['./new-tab-page.component.scss'],
})
export class NewTabPageComponent implements OnInit {
  repoPath = '';
  @Output() onLoadClicked = new EventEmitter<string>();

  constructor(public modalService: ModalService) {}

  ngOnInit() {}

  loadClicked($event?: string) {
    this.repoPath = $event ?? this.repoPath;
    this.onLoadClicked.emit(this.repoPath.replace(/["']/g, ''));
  }
}
