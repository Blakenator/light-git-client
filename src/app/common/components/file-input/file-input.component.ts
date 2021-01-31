import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
const electron = (window as any).require('electron');

interface TFilePath {
  path: string;
  name: string;
}

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss'],
})
export class FileInputComponent {
  @Input() isFolder = false;
  @Input() disabled = false;
  @Input() allowMultiple = false;
  @Input() filter: string[] = ['*'];
  @Input() label = '';
  @Input() removeQuotes = true;
  @Input() filePath = '';
  @Output() onEnterKeyPressed = new EventEmitter<string>();
  @Output() filePathChange = new EventEmitter<string>();

  constructor() {}

  changeFilePath($event?: any) {
    let files: Record<number, TFilePath> & {
      length: number;
    } = ($event && $event.target.files) || [];
    this._setPaths(Object.values(files).map((f: TFilePath) => f.path));
  }

  enterKeyPressed() {
    this.onEnterKeyPressed.emit(this.getFormattedFile());
  }

  openClicked() {
    this._setPaths(
      electron.remote.dialog.showOpenDialogSync({
        properties: ['openDirectory'],
      }),
    );
  }

  private _setPaths(paths: string[]) {
    if (paths && paths.length > 0) {
      if (this.allowMultiple) {
        this.filePath = paths.join(',');
      } else {
        this.filePath = paths[0];
      }
    }
    this.filePathChange.emit(this.getFormattedFile());
  }

  private getFormattedFile() {
    return this.removeQuotes ? this.filePath.replace('"', '') : this.filePath;
  }
}
