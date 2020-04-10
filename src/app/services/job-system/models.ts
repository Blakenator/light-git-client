import {v4 as uuidv4} from 'uuid';

export enum RepoArea {
  LOCAL_BRANCHES='LOCAL_BRANCHES',
  REMOTE_BRANCHES='REMOTE_BRANCHES',
  LOCAL_CHANGES='LOCAL_CHANGES',
  STASHES='STASHES',
  SUBMODULES='SUBMODULES',
  COMMIT_HISTORY='COMMIT_HISTORY',
  WORKTREES='WORKTREES',
  SETTINGS='SETTINGS',
}

export enum JobStatus {
  UNSCHEDULED='UNSCHEDULED',
  SCHEDULED='SCHEDULED',
  IN_PROGRESS='IN_PROGRESS',
  SUCCEEDED='SUCCEEDED',
  FAILED='FAILED',
  SKIPPED='SKIPPED'
}

export interface JobConfig<T = any> {
  command: string;
  repoPath: string;
  execute: () => Promise<T>;
  async?: boolean;

  affectedAreas: RepoArea[];
  reorderable?: boolean;
  // preemptible: boolean; //same as reorderable?
  immediate?: boolean;
}

class Deferrable<T> {
  result: Promise<T>;
  private _deferred: { resolve: (arg: T) => void, reject: (arg: any) => void };

  constructor() {
    this.result = new Promise<T>((resolve, reject) => this._deferred = {resolve, reject});
  }

  succeed(arg?: T) {
    this._deferred.resolve(arg);
  }

  fail(arg?: any) {
    this._deferred.reject(arg);
  }
}

export class Job<T = any> extends Deferrable<T> {
  status: JobStatus = JobStatus.UNSCHEDULED;
  operation: Operation<T>;
  id: string;
  channel: string;

  constructor(public config: JobConfig<T>) {
    super();
    this.id = uuidv4();
    this.channel = this.config.async ? undefined : this.config.repoPath;
  }

  setStatus(status: JobStatus) {
    this.status = status;
    if (status !== JobStatus.SUCCEEDED && status !== JobStatus.SKIPPED) {
      this.operation.status = status;
    } else if (status !== JobStatus.SUCCEEDED && this.operation.jobs.every(job => job.status === JobStatus.SUCCEEDED)) {
      this.operation.status = status;
      this.operation.succeed();
    }
  }
}

export interface OperationConfig<T = void> {
  jobs: Job<T>[];
  name: string;
}

export class Operation<T = void> extends Deferrable<T> {
  id: string;
  status: JobStatus = JobStatus.UNSCHEDULED;
  jobs: Job<T>[] = [];
  name: string;

  constructor(config: OperationConfig<T>) {
    super();
    this.id = uuidv4();
    this.name = config.name;
    this.registerJobs(config.jobs);
  }

  registerJob(job: Job<T>) {
    this.registerJobs([job]);
  }

  registerJobs(jobs: Job<T>[]) {
    jobs.forEach(job => job.operation = this);
    this.jobs = this.jobs.concat(jobs);
  }
}
