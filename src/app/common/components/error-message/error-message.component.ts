import {Component, OnInit} from '@angular/core';
import {ErrorService} from '../../services/error.service';
import {ErrorModel} from '../../../../../shared/common/error.model';
import {ModalService} from '../../services/modal.service';
import {ClipboardService} from '../../../services/clipboard.service';

@Component({
  selector: 'app-error-message',
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss'],
})
export class ErrorMessageComponent implements OnInit {
  errors: ErrorModel[] = [];
  currentError = 0;
  getRootError = ErrorModel.getRootError;

  constructor(private errorService: ErrorService,
              private modalService: ModalService,
              public clipboardService: ClipboardService) {
    errorService.onErrorReceived.asObservable().subscribe(error => this.handleError(error));
  }

  getRootErrorMessage(error: any) {
    return ErrorModel.reduceErrorContent(ErrorModel.getRootError(error));
  }

  ngOnInit() {
  }

  close() {
    this.errors = [];
    this.modalService.setModalVisible('error', false);
  }

  cycleError(next: number) {
    this.currentError = (this.currentError + next < 0 ?
                         this.currentError + next + this.errors.length :
                         this.currentError + next) % this.errors.length;
  }

  private handleError(error: ErrorModel) {
    console.log(error);
    this.errors.push(error);
    this.modalService.setModalVisible('error', true);
  }
}
