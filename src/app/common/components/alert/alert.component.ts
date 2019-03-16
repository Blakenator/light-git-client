import {Component, OnInit} from '@angular/core';
import {AlertService} from '../../services/alert.service';
import {NotificationModel} from '../../../../../shared/notification.model';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
})
export class AlertComponent implements OnInit {
  notifications: NotificationModel[] = [];
  timeouts: number[] = [];

  constructor(private alertService: AlertService) {
  }

  ngOnInit() {
    this.alertService.onShow.subscribe(notification => {
      this.notifications.push(notification);
      this.timeouts.push(window.setTimeout(() => {
        this.notifications.shift();
      }, 4000));
    });
  }

  dismissAlert(index: number) {
    this.notifications.splice(index, 1);
    clearTimeout(this.timeouts[index]);
    this.timeouts.splice(index, 1);
  }
}
