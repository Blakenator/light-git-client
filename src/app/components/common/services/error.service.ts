import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {ErrorModel} from '../../../../../shared/common/error.model';
import {ElectronService} from '../../../services/electron.service';
import {Channels} from '../../../../../shared/Channels';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  onErrorReceived = new Subject<ErrorModel>();

  constructor(private electronService: ElectronService) {
  }

  public receiveError(error: ErrorModel) {
    this.onErrorReceived.next(error);
    this.electronService.rpc(Channels.LOG, [JSON.stringify(error)]);
  }
}
