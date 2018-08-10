import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent implements OnInit {
  @Input() isFolder = false;
  @Input() allowMultiple = false;
  @Input() filter:string[]= ['*'];
  @Input() label = '';
  @Input() filePath = '';
  @Output() onEnterKeyPressed = new EventEmitter<string>();

  constructor() {
  }

  ngOnInit() {
  }

  changeFilePath($event) {
    if ($event.target.files.length > 0) {
      this.filePath = Object.values(<{ [key: number]: { path: string } }>$event.target.files).map(x => x.path).join(",");
      console.log($event);
    }
  }
}
