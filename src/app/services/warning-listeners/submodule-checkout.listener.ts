import {WarningListenerBase} from './warning.listener.base';

export class SubmoduleCheckoutListener extends WarningListenerBase<undefined> {

  protected _regexMatch: RegExp = /Submodule\s+path\s+'.*?':\s+checked\s+out/i;

  protected _transform(output: string): undefined {
    return undefined;
  }
}
