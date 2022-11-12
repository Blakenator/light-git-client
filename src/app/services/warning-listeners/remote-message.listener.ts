import { WarningListenerBase } from './warning.listener.base';
import { NotificationModel } from '../../../../shared/notification.model';

export class RemoteMessageListener extends WarningListenerBase<NotificationModel> {
  protected _regexMatch: RegExp = /^(\s*remote:(\s+.*?\r?\n?)?)+$/im;

  protected preprocess(message: string): string {
    return message.replace(/\r?\n\s*(\r?\n|$)/g, '');
  }

  protected _transform(output: string) {
    return {
      result: new NotificationModel(
        'Message from Remote',
        output.replace(/remote:\s+/g, ''),
      ),
      isError: false,
    };
  }
}
