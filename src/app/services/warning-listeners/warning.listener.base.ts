import {CommandOutputModel} from '../../../../shared/common/command.output.model';
import {Subject} from 'rxjs';

export abstract class WarningListenerBase<U> {
  protected _regexMatch: RegExp;

  constructor(protected onDetect?: Subject<U>) {
  }

  detect<T>(promise: Promise<CommandOutputModel<T>>, onCatch: boolean = false) {
    return new Promise<T>((resolve, reject) => {
      if (onCatch) {
        promise.then(output => output ? resolve(output.content) : resolve()).catch(output => {
          this._detectInternal(output, resolve, reject);
        });
      } else {
        promise.then(output => {
          this._detectInternal(output, resolve, reject);
        }).catch(output => output ? reject(output.errorOutput || output) : reject());
      }
    });
  }

  protected _detectInternal<T>(output: string | CommandOutputModel,
                               resolve: Function,
                               reject: Function): Promise<T> {
    if (output == undefined) {
      resolve();
      return;
    }
    if (typeof output == 'string') {
      let crlfMatch = output.match(this._regexMatch);
      if (crlfMatch) {
        if (this.onDetect) {
          this.onDetect.next(this._transform(output));
        }
        resolve();
      } else {
        reject(output);
      }
    } else {
      if (!output.errorOutput) {
        resolve(output.content);
        return;
      }
      let crlfMatch = output.errorOutput.match(this._regexMatch);
      if (crlfMatch) {
        if (this.onDetect) {
          this.onDetect.next(this._transform(output.errorOutput));
        }
        resolve(output.content);
      } else {
        reject(output.errorOutput);
      }
    }
  }

  protected abstract _transform(output: string): U;

  protected preprocess(message: string) {
    return message;
  }
}
