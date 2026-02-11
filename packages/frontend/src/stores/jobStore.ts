import { create } from 'zustand';
import { useCallback, useMemo, useRef } from 'react';

// Simple ID generator (no external dependency needed)
let idCounter = 0;
const generateId = () => `job_${Date.now()}_${++idCounter}`;

// Repo areas that can be affected by a job
export enum RepoArea {
  LOCAL_BRANCHES = 'LOCAL_BRANCHES',
  REMOTE_BRANCHES = 'REMOTE_BRANCHES',
  LOCAL_CHANGES = 'LOCAL_CHANGES',
  STASHES = 'STASHES',
  SUBMODULES = 'SUBMODULES',
  COMMIT_HISTORY = 'COMMIT_HISTORY',
  WORKTREES = 'WORKTREES',
  SETTINGS = 'SETTINGS',
}

export const RepoAreaDefaults = {
  ALL: new Set([
    RepoArea.LOCAL_BRANCHES,
    RepoArea.REMOTE_BRANCHES,
    RepoArea.LOCAL_CHANGES,
    RepoArea.STASHES,
    RepoArea.SUBMODULES,
    RepoArea.COMMIT_HISTORY,
    RepoArea.WORKTREES,
  ]),
  LOCAL: new Set([
    RepoArea.LOCAL_BRANCHES,
    RepoArea.LOCAL_CHANGES,
    RepoArea.STASHES,
    RepoArea.SUBMODULES,
    RepoArea.COMMIT_HISTORY,
    RepoArea.WORKTREES,
  ]),
};

export enum JobStatus {
  UNSCHEDULED = 'UNSCHEDULED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface JobConfig<T = any> {
  command: string;
  repoPath: string;
  execute: () => Promise<T>;
  async?: boolean;
  affectedAreas: RepoArea[];
  reorderable?: boolean;
  immediate?: boolean;
}

// Deferred promise pattern
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  let reject: (error: any) => void = () => {};

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

export interface Job<T = any> {
  id: string;
  config: JobConfig<T>;
  status: JobStatus;
  channel: string | undefined;
  operationId: string;
  deferred: Deferred<T>;
}

export interface Operation<T = any> {
  id: string;
  name: string;
  status: JobStatus;
  jobIds: string[];
  deferred: Deferred<T>;
}

interface JobState {
  jobs: Map<string, Job>;
  operations: Map<string, Operation>;
  queues: Map<string, string[]>; // channel -> jobIds
  runningChannels: Set<string>;
  pastJobIds: string[];
  affectedAreas: Set<RepoArea>;

  // Subscribers for queue events
  onFinishQueueCallbacks: Array<
    (data: { affectedAreas: Set<RepoArea>; path: string }) => void
  >;
  onStartQueueCallbacks: Array<(path: string) => void>;
}

interface JobActions {
  // Create a job (doesn't schedule it yet)
  createJob: <T>(config: JobConfig<T>) => Job<T>;

  // Schedule a single job as a simple operation
  scheduleSimpleOperation: <T>(job: Job<T>) => Operation<T>;

  // Schedule an operation with multiple jobs
  scheduleOperation: <T>(name: string, jobs: Job<T>[]) => Operation<T>;

  // Schedule jobs
  schedule: (jobs: Job[]) => void;

  // Start processing queues
  start: () => void;

  // Get active jobs (first job in each queue)
  getActiveJobs: () => Job[];

  // Check if a channel is running
  isRunning: (path: string) => boolean;

  // Subscribe to queue finish events
  onFinishQueue: (
    callback: (data: { affectedAreas: Set<RepoArea>; path: string }) => void,
  ) => () => void;

  // Subscribe to queue start events
  onStartQueue: (callback: (path: string) => void) => () => void;
}

export const useJobStore = create<JobState & JobActions>((set, get) => ({
  jobs: new Map(),
  operations: new Map(),
  queues: new Map(),
  runningChannels: new Set(),
  pastJobIds: [],
  affectedAreas: new Set(),
  onFinishQueueCallbacks: [],
  onStartQueueCallbacks: [],

  createJob: <T>(config: JobConfig<T>): Job<T> => {
    const job: Job<T> = {
      id: generateId(),
      config,
      status: JobStatus.UNSCHEDULED,
      channel: config.async ? undefined : config.repoPath,
      operationId: '',
      deferred: createDeferred<T>(),
    };
    return job;
  },

  scheduleSimpleOperation: <T>(job: Job<T>): Operation<T> => {
    const operation: Operation<T> = {
      id: generateId(),
      name: job.config.command,
      status: JobStatus.UNSCHEDULED,
      jobIds: [job.id],
      deferred: createDeferred<T>(),
    };

    job.operationId = operation.id;

    set((state) => {
      const newJobs = new Map(state.jobs);
      const newOperations = new Map(state.operations);
      newJobs.set(job.id, job);
      newOperations.set(operation.id, operation);
      return { jobs: newJobs, operations: newOperations };
    });

    get().schedule([job]);
    return operation;
  },

  scheduleOperation: <T>(name: string, jobs: Job<T>[]): Operation<T> => {
    const operation: Operation<T> = {
      id: generateId(),
      name,
      status: JobStatus.UNSCHEDULED,
      jobIds: jobs.map((j) => j.id),
      deferred: createDeferred<T>(),
    };

    jobs.forEach((job) => {
      job.operationId = operation.id;
    });

    set((state) => {
      const newJobs = new Map(state.jobs);
      const newOperations = new Map(state.operations);
      jobs.forEach((job) => newJobs.set(job.id, job));
      newOperations.set(operation.id, operation);
      return { jobs: newJobs, operations: newOperations };
    });

    get().schedule(jobs);
    return operation;
  },

  schedule: (jobs: Job[]) => {
    set((state) => {
      const newQueues = new Map(state.queues);
      const newJobs = new Map(state.jobs);

      // Group jobs by channel
      const jobsByChannel = new Map<string, Job[]>();
      jobs.forEach((job) => {
        const channel = job.channel || '__async__';
        if (!jobsByChannel.has(channel)) {
          jobsByChannel.set(channel, []);
        }
        jobsByChannel.get(channel)!.push(job);
      });

      // Queue jobs by channel (all operations produce new arrays -- never mutate in place)
      jobsByChannel.forEach((channelJobs, channel) => {
        // Start with a fresh copy of the existing queue (or empty)
        let queue = [...(newQueues.get(channel) || [])];

        // Handle immediate jobs
        const immediate = channelJobs.filter((j) => j.config.immediate);
        if (immediate.length > 0) {
          let nextNonImmediate = queue.findIndex((jobId, i) => {
            const existingJob = newJobs.get(jobId);
            return i > 0 && existingJob && !existingJob.config.immediate;
          });
          if (nextNonImmediate === -1) nextNonImmediate = queue.length;
          const immediateIds = immediate.map((j) => j.id);
          queue = [
            ...queue.slice(0, nextNonImmediate),
            ...immediateIds,
            ...queue.slice(nextNonImmediate),
          ];
        }

        // Handle non-immediate jobs (with reorderable deduplication)
        const nonImmediate = channelJobs.filter((j) => !j.config.immediate);
        if (nonImmediate.length > 0) {
          const commands = new Set(nonImmediate.map((j) => j.config.command));

          // Remove reorderable jobs with matching commands, but never remove the
          // currently executing job (head of queue for a running channel).
          const isChannelRunning = state.runningChannels.has(channel);
          queue = queue.filter((jobId, idx) => {
            // Never remove the currently executing job (index 0 of a running channel)
            if (idx === 0 && isChannelRunning) return true;

            const existingJob = newJobs.get(jobId);
            if (
              existingJob &&
              existingJob.config.reorderable &&
              commands.has(existingJob.config.command)
            ) {
              // Resolve the superseded job's deferred to prevent Promise.all hangs
              existingJob.deferred?.resolve(undefined as any);

              // Also resolve the operation's deferred if present
              const op = state.operations.get(existingJob.operationId);
              if (op && op.jobIds.length === 1) {
                op.deferred?.resolve(undefined as any);
              }

              return false; // remove superseded job
            }
            return true; // keep
          });

          queue = [...queue, ...nonImmediate.map((j) => j.id)];
        }

        // Store the new array in the new Map
        newQueues.set(channel, queue);
      });

      // Update job statuses (always create new job objects -- never mutate)
      jobs.forEach((job) => {
        newJobs.set(job.id, { ...job, status: JobStatus.SCHEDULED });
      });

      return { queues: newQueues, jobs: newJobs };
    });

    // Start processing asynchronously
    Promise.resolve().then(() => get().start());
  },

  start: () => {
    const { queues, runningChannels, onStartQueueCallbacks } = get();

    queues.forEach((queue, channel) => {
      if (!runningChannels.has(channel) && queue.length > 0) {
        // Mark channel as running
        set((state) => ({
          runningChannels: new Set(state.runningChannels).add(channel),
        }));

        // Notify subscribers
        onStartQueueCallbacks.forEach((cb) => cb(channel));

        // Process queue
        const processQueue = async () => {
          let currentQueue = get().queues.get(channel) || [];

          while (currentQueue.length > 0) {
            await executeNextJob(channel);
            currentQueue = get().queues.get(channel) || [];
          }

          // Mark channel as not running
          const { affectedAreas, onFinishQueueCallbacks } = get();
          set((state) => {
            const newRunningChannels = new Set(state.runningChannels);
            newRunningChannels.delete(channel);
            return {
              runningChannels: newRunningChannels,
              affectedAreas: new Set(),
            };
          });

          // Notify subscribers
          onFinishQueueCallbacks.forEach((cb) =>
            cb({ affectedAreas, path: channel }),
          );
        };

        processQueue();
      }
    });

    async function executeNextJob(channel: string) {
      const state = get();
      const queue = state.queues.get(channel);
      if (!queue || queue.length === 0) return;

      const jobId = queue[0];
      const job = state.jobs.get(jobId);
      if (!job) {
        // Remove invalid job from queue (immutable -- new array without first element)
        set((state) => {
          const newQueues = new Map(state.queues);
          const q = newQueues.get(channel) || [];
          newQueues.set(channel, q.slice(1));
          return { queues: newQueues };
        });
        return;
      }

      const operation = state.operations.get(job.operationId);

      // Skip if operation already failed
      if (operation && operation.status === JobStatus.FAILED) {
        set((state) => {
          const newJobs = new Map(state.jobs);
          const newQueues = new Map(state.queues);
          const updatedJob = { ...job, status: JobStatus.SKIPPED };
          newJobs.set(job.id, updatedJob);
          const q = newQueues.get(channel) || [];
          newQueues.set(channel, q.slice(1));
          return { jobs: newJobs, queues: newQueues };
        });
        return;
      }

      // Mark job as in progress
      set((state) => {
        const newJobs = new Map(state.jobs);
        const newOperations = new Map(state.operations);
        const updatedJob = { ...job, status: JobStatus.IN_PROGRESS };
        newJobs.set(job.id, updatedJob);
        if (operation) {
          newOperations.set(operation.id, {
            ...operation,
            status: JobStatus.IN_PROGRESS,
          });
        }
        return { jobs: newJobs, operations: newOperations };
      });

      try {
        const result = await job.config.execute();

        // Mark job as succeeded
        job.deferred.resolve(result);

        set((state) => {
          const newJobs = new Map(state.jobs);
          const newOperations = new Map(state.operations);
          const newQueues = new Map(state.queues);
          const newAffectedAreas = new Set(state.affectedAreas);

          const updatedJob = { ...job, status: JobStatus.SUCCEEDED };
          newJobs.set(job.id, updatedJob);

          // Check if all jobs in operation succeeded
          const op = newOperations.get(job.operationId);
          if (op) {
            const allSucceeded = op.jobIds.every((id) => {
              const j = newJobs.get(id);
              return j && j.status === JobStatus.SUCCEEDED;
            });
            if (allSucceeded) {
              op.deferred.resolve(result);
              newOperations.set(op.id, { ...op, status: JobStatus.SUCCEEDED });
            }
          }

          // Track affected areas
          job.config.affectedAreas.forEach((area) =>
            newAffectedAreas.add(area),
          );

          // Remove job from queue (immutable -- new array without first element)
          const q = newQueues.get(channel) || [];
          newQueues.set(channel, q.slice(1));

          // Add to past jobs
          const newPastJobIds = [...state.pastJobIds, job.id];

          return {
            jobs: newJobs,
            operations: newOperations,
            queues: newQueues,
            affectedAreas: newAffectedAreas,
            pastJobIds: newPastJobIds,
          };
        });
      } catch (error) {
        // Mark job as failed
        job.deferred.reject(error);

        set((state) => {
          const newJobs = new Map(state.jobs);
          const newOperations = new Map(state.operations);
          const newQueues = new Map(state.queues);
          const newAffectedAreas = new Set(state.affectedAreas);

          const updatedJob = { ...job, status: JobStatus.FAILED };
          newJobs.set(job.id, updatedJob);

          // Mark operation as failed
          const op = newOperations.get(job.operationId);
          if (op) {
            op.deferred.reject(error);
            newOperations.set(op.id, { ...op, status: JobStatus.FAILED });
          }

          // Track affected areas
          job.config.affectedAreas.forEach((area) =>
            newAffectedAreas.add(area),
          );

          // Remove job from queue (immutable -- new array without first element)
          const q = newQueues.get(channel) || [];
          newQueues.set(channel, q.slice(1));

          // Add to past jobs
          const newPastJobIds = [...state.pastJobIds, job.id];

          return {
            jobs: newJobs,
            operations: newOperations,
            queues: newQueues,
            affectedAreas: newAffectedAreas,
            pastJobIds: newPastJobIds,
          };
        });
      }
    }
  },

  getActiveJobs: () => {
    const { queues, jobs } = get();
    const result: Job[] = [];
    queues.forEach((queue) => {
      queue.forEach((jobId) => {
        const job = jobs.get(jobId);
        if (job) result.push(job);
      });
    });
    return result;
  },

  isRunning: (path: string) => {
    return get().runningChannels.has(path);
  },

  onFinishQueue: (callback) => {
    set((state) => ({
      onFinishQueueCallbacks: [...state.onFinishQueueCallbacks, callback],
    }));
    return () => {
      set((state) => ({
        onFinishQueueCallbacks: state.onFinishQueueCallbacks.filter(
          (cb) => cb !== callback,
        ),
      }));
    };
  },

  onStartQueue: (callback) => {
    set((state) => ({
      onStartQueueCallbacks: [...state.onStartQueueCallbacks, callback],
    }));
    return () => {
      set((state) => ({
        onStartQueueCallbacks: state.onStartQueueCallbacks.filter(
          (cb) => cb !== callback,
        ),
      }));
    };
  },
}));

// Helper hook to create and schedule jobs easily
export function useJobScheduler() {
  const createJob = useJobStore((state) => state.createJob);
  const scheduleSimpleOperation = useJobStore(
    (state) => state.scheduleSimpleOperation,
  );
  const scheduleOperation = useJobStore((state) => state.scheduleOperation);
  const getActiveJobs = useJobStore((state) => state.getActiveJobs);
  const isRunning = useJobStore((state) => state.isRunning);

  // Use refs to keep runJob stable across renders while always using latest store functions
  const createJobRef = useRef(createJob);
  createJobRef.current = createJob;
  const scheduleSimpleOperationRef = useRef(scheduleSimpleOperation);
  scheduleSimpleOperationRef.current = scheduleSimpleOperation;

  // Stable runJob that never changes reference
  const runJob = useCallback(async <T>(config: JobConfig<T>): Promise<T> => {
    const job = createJobRef.current(config);
    const operation = scheduleSimpleOperationRef.current(job);
    return operation.deferred.promise;
  }, []);

  return useMemo(
    () => ({
      createJob,
      scheduleSimpleOperation,
      scheduleOperation,
      getActiveJobs,
      isRunning,
      runJob,
    }),
    [
      createJob,
      scheduleSimpleOperation,
      scheduleOperation,
      getActiveJobs,
      isRunning,
      runJob,
    ],
  );
}
