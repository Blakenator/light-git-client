import {ErrorHandler, Injectable, Injector} from '@angular/core';
import {ElectronService} from './electron.service';
import {Channels} from '../../../../shared/Channels';
import {ErrorService} from './error.service';
import {ErrorModel} from '../../../../shared/common/error.model';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  error: any = {stack: ''};

  constructor(private injector: Injector) {
  }

  handleError(error: any): void {
    console.error(error);
    const errorText = error.stack || JSON.stringify(error);
    new ElectronService().rpc(Channels.LOG, [errorText]);
    this.error = error;
    const errorService = this.injector.get(ErrorService);
    if (errorService && !error.stack.match(/expressionchangedafterithasbeencheckederror/i)) {
      errorService.receiveError(new ErrorModel('angularError', 'performing an unknown operation', error.stack));
    }
  }
}
