import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private _loading = new Subject<boolean>();

  private _isLoading = false;

  public get isLoading() {
    return this._isLoading;
  }

  public get onLoadingChanged() {
    return this._loading.asObservable();
  }

  public setLoading(val: boolean) {
    this._isLoading = val;
    this._loading.next(val);
  }
}
