import {Injectable} from '@angular/core';
import {Job, JobStatus, Operation, OperationConfig, RepoArea} from './models';
import * as _ from 'lodash';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class JobSchedulerService {
  private _pastJobs: Job[] = [];
  private _queueMap = new Map<string, Job[]>();
  private _isRunningMap = new Map<string, boolean>();
  private _affectedAreas: Set<RepoArea> = new Set<RepoArea>();

  private _onFinishQueue = new Subject<{ affectedAreas: Set<RepoArea>, path: string }>();
  public onFinishQueue = this._onFinishQueue.asObservable();
  private _onStartQueue = new Subject<string>();
  public onStartQueue = this._onStartQueue.asObservable();

  scheduleSimpleOperation<T>(job: Job<T>) {
    let operation = new Operation<T>({name: job.config.command, jobs: [job]});
    this.schedule(operation.jobs);
    return operation;
  }

  scheduleOperation<T>(config: OperationConfig<T>) {
    let operation = new Operation<T>(config);
    this.schedule(operation.jobs);
    return operation;
  }

  schedule(jobs: Job[]) {
    const jobsByChannel = _.groupBy(jobs, j => j.channel);
    Object.keys(jobsByChannel).forEach(channel => {
      if (!this._queueMap.has(channel)) {
        this._queueMap.set(channel, []);
      }
      let queue = this._queueMap.get(channel);
      this._queueJobs(jobs, queue);
    });

    jobs.forEach(job => {
      job.setStatus(JobStatus.SCHEDULED);
    });

    Promise.resolve().then(() => this.start());
  }

  start() {
    this._queueMap.forEach(async (queue, path) => {
      if (!this.isRunning(path)) {
        if (queue.length === 0) {
          return;
        }
        this._isRunningMap.set(path, true);
        this._onStartQueue.next(path);
        while (queue.length > 0) {
          await this.executeNext(queue, path);
        }
          this._isRunningMap.set(path, false);
          this._onFinishQueue.next({affectedAreas: this._affectedAreas, path});
          this._affectedAreas = new Set<RepoArea>();
      }
    });
  }

  executeNext(queue: Job[], path: string) {
    const job = queue.shift();

    if (job.operation.status === JobStatus.FAILED) {
      job.setStatus(JobStatus.SKIPPED);
      return Promise.resolve();
    }

    job.setStatus(JobStatus.IN_PROGRESS);

    return job.config.execute().then(result => {
      job.succeed(result);
      job.setStatus(JobStatus.SUCCEEDED);
      if (job.operation.jobs.every(j => j.status === JobStatus.SUCCEEDED)) {
        job.operation.succeed(result);
      }
    }).catch(error => {
      job.setStatus(JobStatus.FAILED);
      job.fail(error);
      job.operation.fail(error);
    }).finally(() => {
      this._pastJobs.push(job);
      job.config.affectedAreas.forEach(area => {
        this._affectedAreas.add(area);
      });
    });
  }

  getPastJobs(): ReadonlyArray<Job> {
    return this._pastJobs;
  }

  getActiveJobs(): ReadonlyArray<Job> {
    const result = [];
    this._queueMap.forEach(queue => {
      if (queue.length > 0) {
        result.push(queue[0]);
      }
    });
    return result;
  }

  isRunning(path: string) {
    return !!this._isRunningMap.get(path);
  }

  private _queueJobs(jobs: Job[], queue: Job[]) {
    const immediate = jobs.filter(j => j.config.immediate);
    if (immediate.length > 0) {
      let nextNonImmediate = queue.findIndex((job, i) => i > 0 && !job.config.immediate);
      queue.splice(nextNonImmediate, 0, ...jobs);
    }
    if (immediate.length === jobs.length) {
      return;
    }
    const nonImmediate = jobs.filter(j => !j.config.immediate);
    const commands = new Set(nonImmediate.map(j => j.config.command));
    // pull up reorderables
    let i = queue.length - 1;
    while (i >= 0) {
      let j = queue[i];
      if (j.config.reorderable && commands.has(j.config.command)) {
        queue.splice(i, 1);
      }
      i--;
    }
    queue.push(...nonImmediate);
  }
}
