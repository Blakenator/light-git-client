import {Component, OnInit} from '@angular/core';
import {ErrorService} from '../../services/error.service';
import {ErrorModel} from '../../../../../../shared/common/error.model';

@Component({
  selector: 'app-error-message',
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss']
})
export class ErrorMessageComponent implements OnInit {
  errors: ErrorModel[] = [];
  currentError = 0;
  showDialog: boolean;
  getRootError = ErrorModel.getRootError;

  constructor(private errorService: ErrorService) {
    errorService.onErrorReceived.asObservable().subscribe(error => this.handleError(error));
  }

  getRootErrorMessage(error: any) {
    return ErrorModel.reduceErrorContent(ErrorModel.getRootError(error));
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

  private handleError(error: ErrorModel) {
    console.log(error);
    this.errors.push(error);
    this.showDialog = true;
  }
}
