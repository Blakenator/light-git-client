import {WarningListenerBase} from './warning.listener.base';

export class SubmoduleCheckoutListener extends WarningListenerBase<undefined> {

  protected _regexMatch: RegExp = /\*?\s*Submodule\s+path\s+'.*?':\s+checked\s+out\r?\n?/i;

  protected _transform(output: string): undefined {
    return undefined;
  }
}
