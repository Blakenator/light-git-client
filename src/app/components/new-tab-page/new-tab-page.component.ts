import {Component, EventEmitter, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-new-tab-page',
  templateUrl: './new-tab-page.component.html',
  styleUrls: ['./new-tab-page.component.scss']
})
export class NewTabPageComponent implements OnInit {
  repoPath = {path:''};
  @Output() onReady = new EventEmitter<string>();

  constructor() {
  }

  ngOnInit() {
  }

  readyClicked() {
    this.onReady.emit(this.repoPath.path.replace(/["']/g, ''));
  }
}
