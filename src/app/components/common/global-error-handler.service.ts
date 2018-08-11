import {ErrorHandler, Injectable} from '@angular/core';
import {ElectronService} from "../../providers/electron.service";
import {Channels} from "../../../../shared/Channels";

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  error: any = {stack: ''};

  constructor() {
  }

  handleError(error: any): void {
    console.log(error);
    const errorText = error.stack || JSON.stringify(error);
    new ElectronService().rpc(Channels.LOG, [errorText]);
    if ((errorText) != (this.error.stack || JSON.stringify(this.error))) {
      alert(errorText);
    }
    this.error = error;
  }
}
