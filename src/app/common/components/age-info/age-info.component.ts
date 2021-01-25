import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-age-info',
  templateUrl: './age-info.component.html',
  styleUrls: ['./age-info.component.scss'],
})
export class AgeInfoComponent {
  @Input() date: Date | string;

  constructor() {}

  static getTimeSinceString(date: Date) {
    let totalMinutes = (new Date().getTime() - date.getTime()) / 1000 / 60;
    let result = [];
    let days = Math.floor(totalMinutes / 60 / 24);
    if (days > 0) {
      result.push(`${days}d`);
    }
    let hours = Math.floor(totalMinutes / 60) % 24;
    if (hours > 0 && days < 10) {
      result.push(`${hours}h`);
    }
    let minutes = Math.floor(totalMinutes) % 60;
    if (minutes > 0 && hours < 10 && days === 0) {
      result.push(`${minutes}m`);
    }
    return result.join(' ');
  }

  getAgeString() {
    return AgeInfoComponent.getTimeSinceString(
      typeof this.date === 'string' ? new Date(this.date) : this.date,
    );
  }
}
