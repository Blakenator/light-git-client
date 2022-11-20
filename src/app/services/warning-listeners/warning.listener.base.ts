import { CommandOutputModel } from '../../../../shared/common/command.output.model';
import { Subject } from 'rxjs';

export abstract class WarningListenerBase<U> {
  protected _regexMatch: RegExp;

  constructor(protected onDetect?: Subject<U>) {}

  detect<T>(promise: Promise<CommandOutputModel<T>>, onCatch: boolean = false) {
    return new Promise<T>((resolve, reject) => {
      if (onCatch) {
        promise
          .then((output) =>
            output ? resolve(output.content) : resolve(undefined),
          )
          .catch((output) => {
            this._detectInternal(output, resolve, reject);
          });
      } else {
        promise
          .then((output) => {
            this._detectInternal(output, resolve, reject);
          })
          .catch((output) =>
            output ? reject(output.errorOutput || output) : reject(),
          );
      }
    });
  }

  protected _detectInternal<T>(
    output: string | CommandOutputModel,
    resolve: Function,
    reject: Function,
  ): void {
    if (output == undefined) {
      resolve();
      return;
    }
    if (typeof output == 'string') {
      const processed = this.preprocess(output);
      let listenerMatch = processed.match(this._regexMatch);
      if (listenerMatch) {
        const { result, isError } = this._transform(processed);
        if (this.onDetect) {
          this.onDetect.next(result);
        }
        if (isError) {
          reject();
        } else {
          resolve();
        }
      } else {
        reject(output);
      }
    } else {
      if (!output.errorOutput) {
        resolve(output.content);
        return;
      }
      const processed = this.preprocess(output.errorOutput);
      let listenerMatch = processed.match(this._regexMatch);
      if (listenerMatch) {
        const { result, isError } = this._transform(processed);
        if (this.onDetect) {
          this.onDetect.next(result);
        }
        if (isError) {
          reject();
        } else {
          resolve(output.content);
        }
      } else {
        reject(output.errorOutput);
      }
    }
  }

  protected abstract _transform(output: string): {
    result: U;
    isError: boolean;
  };

  protected preprocess(message: string) {
    return message;
  }
}
