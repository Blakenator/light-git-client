import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-error-message',
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss']
})
export class ErrorMessageComponent implements OnInit {
  @Input() errorMessage: { error: string };

  constructor() {
  }

  ngOnInit() {
  }

  close() {
    if (this.errorMessage.error) {
      this.errorMessage.error = '';
    }
    this.errorMessage = undefined;
  }

  getErrorMessage() {
    console.log(this.errorMessage);
    return typeof this.errorMessage.error == 'object' ?
      (JSON.stringify(this.errorMessage.error) == '{}' ? (<any>this.errorMessage.error).toString() : JSON.stringify(this.errorMessage.error)) :
      this.errorMessage.error || JSON.stringify(this.errorMessage);
  }
}
