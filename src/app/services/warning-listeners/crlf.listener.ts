import { WarningListenerBase } from './warning.listener.base';

export class CrlfListener extends WarningListenerBase<{
  start: string;
  end: string;
}> {
  protected _regexMatch: RegExp =
    /^(warning:\s+((CR)?LF)\s+will\s+be\s+replaced\s+by\s+((CR)?LF)\s+in\s+(.+?)(\r?\nThe\s+file\s+will\s+have\s+its\s+original.+?\r?\n?)?)+$/i;

  protected _transform(output: string) {
    let crlfMatch = output.match(this._regexMatch);
    return {
      result: { start: crlfMatch[2], end: crlfMatch[4] },
      isError: false,
    };
  }
}
