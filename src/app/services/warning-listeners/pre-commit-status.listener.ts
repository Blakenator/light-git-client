import { WarningListenerBase } from './warning.listener.base';
import {
  PreCommitStatus,
  PreCommitStatusModel,
} from '../../../../shared/PreCommitStatus.model';

export class PreCommitStatusListener extends WarningListenerBase<PreCommitStatusModel> {
  protected _regexMatch: RegExp =
    /^(.+?)\.{2}\.*(\(.+?\)\s*)?(Failed|Passed|Skipped)/gim;

  protected _transform(output: string) {
    const matches = [...output.matchAll(this._regexMatch)];
    const note = output.substring(0, matches[0].index);
    let status = new PreCommitStatusModel(
      matches.map((match, i) => {
        const [, name, skipReason, status] = match;
        const passed = status !== PreCommitStatus.Failed;
        return {
          name,
          status: status as PreCommitStatus,
          error: passed
            ? skipReason
            : output.substring(
                match.index + match[0].length,
                matches[i + 1]?.index,
              ),
        };
      }),
      note,
    );
    return {
      result: status,
      isError: status.isError(),
    };
  }
}
