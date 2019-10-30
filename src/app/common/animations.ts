import {animate, style, transition, trigger} from '@angular/animations';

export class Animations {
  static growHeightIn = trigger('grow', [
    transition(':enter', [
      style({
        opacity: 0,
        height: 0,
      }),
      animate('300ms ease-in-out', style({
        opacity: '*',
        height: '*',
      })),
    ]),
    transition(':leave', [
      style({
        opacity: '*',
        height: '*',
      }),
      animate('300ms ease-in-out', style({
        opacity: 0,
        height: 0,
      })),
    ]),
  ]);
}
