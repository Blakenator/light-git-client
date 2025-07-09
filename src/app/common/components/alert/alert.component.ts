import {Component, OnInit} from '@angular/core';
import {AlertService} from '../../services/alert.service';
import {NotificationModel} from '../../../../../shared/notification.model';

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
    standalone: false
})
export class AlertComponent implements OnInit {
  notifications: NotificationModel[] = [];
  timeouts: number[] = [];

  constructor(private alertService: AlertService) {
  }

  ngOnInit() {
    this.alertService.onShow.subscribe(notification => {
      this.notifications.push(notification);
      this.timeouts.push(this.getTimeout());
    });
  }

  dismissAlert(index: number) {
    this.notifications.splice(index, 1);
    if (this.timeouts[index]) {
      clearTimeout(this.timeouts[index]);
    }
    this.timeouts.splice(index, 1);
  }

  pauseTimeout(i: number) {
    clearTimeout(this.timeouts[i]);
  }

  resumeTimeout(i: number) {
    this.timeouts[i] = this.getTimeout(i);
  }

  private getTimeout(i: number = -1) {
    return window.setTimeout(() => {
      if (i >= 0) {
        this.dismissAlert(i);
      } else {
        this.notifications.shift();
      }
    }, 4000);
  }
}
