import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {NotificationModel} from '../../../../shared/notification.model';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private _onShow = new Subject<NotificationModel>();
  public readonly onShow = this._onShow.asObservable();

  constructor() {
  }

  public showNotification(notification: NotificationModel) {
    this._onShow.next(notification);
  }
}
