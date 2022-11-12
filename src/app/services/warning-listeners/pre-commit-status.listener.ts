import { WarningListenerBase } from './warning.listener.base';
import { NotificationModel } from '../../../../shared/notification.model';
import { PreCommitStatusModel } from '../../../../shared/PreCommitStatus.model';

export class PreCommitStatusListener extends WarningListenerBase<PreCommitStatusModel> {
  protected _regexMatch: RegExp = /^(.+?)\.{2}\.*(Failed|Passed)/gim;

  protected _transform(output: string) {
    const matches = [...output.matchAll(this._regexMatch)];
    const note = output.substring(0, matches[0].index);
    let status = new PreCommitStatusModel(
      matches.map((match, i) => {
        const [, name, status] = match;
        let passed = status === 'Passed';
        return {
          name,
          passed: passed,
          error: passed
            ? undefined
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
      isError: status.rules.some((rule) => !rule.passed),
    };
  }
}
