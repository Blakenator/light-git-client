import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {JobSchedulerService} from './job-system/job-scheduler.service';
import {TabDataService} from './tab-data.service';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private _loading = new Subject<boolean>();

  private _isLoading = false;

  constructor(private jobSchedulerService: JobSchedulerService, private tabDataService: TabDataService) {
    jobSchedulerService.onFinishQueue.subscribe(({path}) => {
      // if (tabDataService.activeRepoCache.path === path) {
        this._loading.next(false);
      // }
    });
    jobSchedulerService.onStartQueue.subscribe((path) => {
      // if (tabDataService.activeRepoCache.path === path) {
        this._loading.next(true);
      // }
    });
  }

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
