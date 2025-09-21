import {Directive, ElementRef, Input, OnInit} from '@angular/core';

@Directive({
    selector: '[autofocus]',
    standalone: false
})
export class AutofocusDirective implements OnInit {
  private focus = true;

  constructor(private el: ElementRef) {
  }

  @Input() set autofocus(condition: boolean) {
    this.focus = condition !== false;
  }

  ngOnInit() {
    if (this.focus) {
      // Otherwise Angular throws error: Expression has changed after it was checked.
      window.setTimeout(() => {
        this.el.nativeElement.focus(); // For SSR (server side rendering) this is not safe. Use: https://github.com/angular/angular/issues/15008#issuecomment-285141070)
      });
    }
  }
}
