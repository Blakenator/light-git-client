import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent implements OnInit {
  @Input() isFolder = false;
  @Input() disabled = false;
  @Input() allowMultiple = false;
  @Input() filter: string[] = ['*'];
  @Input() label = '';
  @Input() removeQuotes = true;
  @Input() filePath = '';
  @Output() onEnterKeyPressed = new EventEmitter<string>();
  @Output() onPathChanged = new EventEmitter<string>();

  constructor() {
  }

  ngOnInit() {
  }

  changeFilePath($event?) {
    if ($event && $event.target.files.length > 0) {
      this.filePath = Object.values(<{ [key: number]: { path: string } }>$event.target.files).map(x => x.path).join(",");
    }
    this.onPathChanged.emit(this.getFormattedFile());
  }

  enterKeyPressed() {
    this.onEnterKeyPressed.emit(this.getFormattedFile());
  }

  private getFormattedFile() {
    return this.removeQuotes ? this.filePath.replace('"', '') : this.filePath;
  }
}
