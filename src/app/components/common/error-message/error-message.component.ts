import {Component, OnInit} from '@angular/core';
import {ErrorService} from '../error.service';
import {ErrorModel} from '../../../../../shared/error.model';

@Component({
  selector: 'app-error-message',
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss']
})
export class ErrorMessageComponent implements OnInit {
  errors: ErrorModel[] = [];
  currentError = 0;
  showDialog: boolean;

  constructor(private errorService: ErrorService) {
    errorService.onErrorReceived.asObservable().subscribe(error => this.handleError(error));
  }

  ngOnInit() {
  }

  close() {
    this.showDialog = false;
    this.errors = [];
  }

  cycleError(next: number) {
    this.currentError = (this.currentError + next < 0 ? this.currentError + next + this.errors.length : this.currentError + next) % this.errors.length;
  }

  getRootError(error: ErrorModel) {
    return ErrorModel.getRootError(error);
  }

  private handleError(error: ErrorModel) {
    console.log(error);
    this.errors.push(error);
    this.showDialog = true;
  }
}
