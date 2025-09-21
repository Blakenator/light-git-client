import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { Channels } from '../../../../../shared/Channels';

const electronApi = (window as any).electronApi;

interface TFilePath {
  path: string;
  name: string;
}

@Component({
    selector: 'app-file-input',
    templateUrl: './file-input.component.html',
    styleUrls: ['./file-input.component.scss'],
    standalone: false
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

  constructor(private electronService: ElectronService) {}

  changeFilePath($event?: any) {
    let files: Record<number, TFilePath> & {
      length: number;
    } = ($event && $event.target.files) || [];
    this._setPaths(Object.values(files).map((f: TFilePath) => f.path));
  }

  enterKeyPressed() {
    this.onEnterKeyPressed.emit(this.getFormattedFile());
  }

  async openClicked() {
    this._setPaths(
      await this.electronService.rpc(Channels.OPENFILEDIALOG, [
        {
          properties: ['openDirectory'],
        },
      ]),
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
