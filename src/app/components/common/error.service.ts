import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {ErrorModel} from '../../../../shared/error.model';
import {ElectronService} from '../../providers/electron.service';
import {Channels} from '../../../../shared/Channels';

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
