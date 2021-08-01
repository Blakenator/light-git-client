import { animate, style, transition, trigger } from '@angular/animations';

export class Animations {
  static growHeightIn = trigger('grow', [
    transition(':enter', [
      style({
        opacity: 0,
        height: 0,
      }),
      animate(
        '300ms ease-in-out',
        style({
          opacity: '*',
          height: '*',
        }),
      ),
    ]),
    transition(':leave', [
      style({
        opacity: '*',
        height: '*',
      }),
      animate(
        '300ms ease-in-out',
        style({
          opacity: 0,
          height: 0,
        }),
      ),
    ]),
  ]);
  static inOut = trigger('inOutAnimation', [
    transition(':enter', [
      style({ height: 0, opacity: 0 }),
      animate('1s ease-out', style({ height: 300, opacity: 1 })),
    ]),
    transition(':leave', [
      style({ height: 300, opacity: 1 }),
      animate('1s ease-in', style({ height: 0, opacity: 0 })),
    ]),
  ]);
}
