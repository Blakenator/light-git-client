import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useJobStore, JobStatus, RepoArea } from './jobStore';
import type { JobConfig, Job } from './jobStore';

/**
 * Helper: create a minimal job config for testing.
 */
function makeConfig(
  overrides: Partial<JobConfig> = {},
): JobConfig<string> {
  return {
    command: overrides.command ?? 'test-command',
    repoPath: overrides.repoPath ?? '/test/repo',
    execute: overrides.execute ?? (() => Promise.resolve('ok')),
    affectedAreas: overrides.affectedAreas ?? [],
    ...overrides,
  };
}

/**
 * Helper: schedule a job and return a promise that resolves with the result.
 */
function runJob(config: JobConfig<string>): Promise<string> {
  const job = useJobStore.getState().createJob(config);
  const op = useJobStore.getState().scheduleSimpleOperation(job);
  return op.deferred.promise;
}

// Reset store state before each test
beforeEach(() => {
  const { setState } = useJobStore as any;
  if (setState) {
    setState({
      jobs: new Map(),
      operations: new Map(),
      queues: new Map(),
      runningChannels: new Set(),
      pastJobIds: [],
      affectedAreas: new Set(),
      parallelCounts: new Map(),
      parallelGates: new Map(),
      onFinishQueueCallbacks: [],
      onStartQueueCallbacks: [],
    });
  }
});

describe('JobScheduler (React)', () => {
  describe('non-parallelizable jobs (sequential execution)', () => {
    it('should complete a single job and return its result', async () => {
      // Why: the caller must receive the result of the git operation to render UI
      // Given: a non-parallelizable job that resolves with a known value
      // When: the job is scheduled and executed
      // Then: the caller receives the resolved value from the operation promise
      const result = await runJob(makeConfig({ command: 'write-op' }));
      expect(result).toBe('ok');
    });

    it('should execute non-parallelizable jobs one at a time on the same repo', async () => {
      // Why: concurrent writes to the same git repo cause index lock conflicts and corruption
      // Given: two non-parallelizable jobs targeting the same repository
      // When: both jobs are scheduled simultaneously
      // Then: the second job does not start until the first job completes
      const order: string[] = [];
      const p1 = runJob(
        makeConfig({
          command: 'write-1',
          execute: async () => { order.push('start-1'); await delay(10); order.push('end-1'); return '1'; },
        }),
      );
      const p2 = runJob(
        makeConfig({
          command: 'write-2',
          execute: async () => { order.push('start-2'); await delay(5); order.push('end-2'); return '2'; },
        }),
      );

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('1');
      expect(r2).toBe('2');
      expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
    });
  });

  describe('parallelizable jobs (concurrent reads)', () => {
    it('should run parallelizable jobs concurrently on the same repo', async () => {
      // Why: read-only git operations do not conflict, so running them in parallel reduces total load time
      // Given: two parallelizable read jobs on the same repository
      // When: both are scheduled together
      // Then: both jobs start before either finishes, and both return their results
      const order: string[] = [];
      const p1 = runJob(
        makeConfig({
          command: 'read-1',
          parallelizable: true,
          execute: async () => { order.push('start-1'); await delay(15); order.push('end-1'); return '1'; },
        }),
      );
      const p2 = runJob(
        makeConfig({
          command: 'read-2',
          parallelizable: true,
          execute: async () => { order.push('start-2'); await delay(10); order.push('end-2'); return '2'; },
        }),
      );

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('1');
      expect(r2).toBe('2');
      expect(order[0]).toBe('start-1');
      expect(order[1]).toBe('start-2');
      expect(order).toContain('end-1');
      expect(order).toContain('end-2');
    });

    it('should deliver the result when a parallel job succeeds', async () => {
      // Why: the caller must receive the resolved value just like any other job
      // Given: a parallelizable job that completes successfully
      // When: the job runs to completion
      // Then: the operation promise resolves with the job's return value
      const result = await runJob(
        makeConfig({ command: 'read-op', parallelizable: true }),
      );
      expect(result).toBe('ok');
    });

    it('should surface the error when a parallel job fails', async () => {
      // Why: the caller must be able to handle failures from parallel jobs
      // Given: a parallelizable job whose execute function rejects with an error
      // When: the job is scheduled
      // Then: the operation promise rejects with the same error
      const promise = runJob(
        makeConfig({
          command: 'read-fail',
          parallelizable: true,
          execute: () => Promise.reject(new Error('boom')),
        }),
      );
      await expect(promise).rejects.toThrow('boom');
    });
  });

  describe('write ↔ read ordering', () => {
    it('should block a write until all in-flight parallel reads finish', async () => {
      // Why: a write operation must not run while a read is still reading repo state
      // Given: a parallelizable read job that takes some time, followed by a non-parallelizable write job on the same repo
      // When: the read is still running when the write reaches the front of the queue
      // Then: the write does not start until the read completes
      const timeline: string[] = [];

      const pRead = runJob(
        makeConfig({
          command: 'read',
          parallelizable: true,
          execute: async () => { timeline.push('start-read'); await delay(30); timeline.push('end-read'); return 'read'; },
        }),
      );
      await delay(5);

      const pWrite = runJob(
        makeConfig({
          command: 'write',
          parallelizable: false,
          execute: async () => { timeline.push('start-write'); await delay(5); timeline.push('end-write'); return 'write'; },
        }),
      );

      const [rRead, rWrite] = await Promise.all([pRead, pWrite]);
      expect(rRead).toBe('read');
      expect(rWrite).toBe('write');
      expect(timeline.indexOf('end-read')).toBeLessThan(timeline.indexOf('start-write'));
    });

    it('should block parallel reads until an in-flight write finishes', async () => {
      // Why: reads that start during an in-progress write may observe inconsistent repo state
      // Given: a non-parallelizable write job that takes some time, followed by parallelizable read jobs on the same repo
      // When: the write is still running when the reads are scheduled
      // Then: none of the reads start until the write completes; afterwards the reads run concurrently
      const timeline: string[] = [];

      const pWrite = runJob(
        makeConfig({
          command: 'write',
          parallelizable: false,
          execute: async () => { timeline.push('start-write'); await delay(30); timeline.push('end-write'); return 'write'; },
        }),
      );
      await delay(5);

      const pRead1 = runJob(
        makeConfig({
          command: 'read-1',
          parallelizable: true,
          execute: async () => { timeline.push('start-r1'); await delay(5); timeline.push('end-r1'); return 'r1'; },
        }),
      );
      const pRead2 = runJob(
        makeConfig({
          command: 'read-2',
          parallelizable: true,
          execute: async () => { timeline.push('start-r2'); await delay(5); timeline.push('end-r2'); return 'r2'; },
        }),
      );

      const [rWrite, r1, r2] = await Promise.all([pWrite, pRead1, pRead2]);
      expect(rWrite).toBe('write');
      expect(r1).toBe('r1');
      expect(r2).toBe('r2');

      const writeEnd = timeline.indexOf('end-write');
      const r1Start = timeline.indexOf('start-r1');
      const r2Start = timeline.indexOf('start-r2');
      expect(writeEnd).toBeLessThan(r1Start);
      expect(writeEnd).toBeLessThan(r2Start);
      expect(r1Start).toBeLessThan(timeline.indexOf('end-r2'));
      expect(r2Start).toBeLessThan(timeline.indexOf('end-r1'));
    });
  });

  describe('stacked write/read sequence', () => {
    it('should correctly alternate: write → parallel reads → write → parallel reads', async () => {
      // Why: the queue must handle interleaved write and read batches without deadlocks or ordering violations
      // Given: seven jobs enqueued in order — write-1, read-1, read-2, read-3, write-2, read-4, read-5
      // When: the queue processes all jobs
      // Then: write-1 runs alone; three reads then run concurrently; write-2 waits for all reads; final two reads run concurrently
      const timeline: string[] = [];

      function makeTimedJob(name: string, parallelizable: boolean, duration: number): JobConfig<string> {
        return makeConfig({
          command: name,
          parallelizable,
          execute: async () => { timeline.push(`start-${name}`); await delay(duration); timeline.push(`end-${name}`); return name; },
        });
      }

      const pW1 = runJob(makeTimedJob('w1', false, 10));
      const pR1 = runJob(makeTimedJob('r1', true, 15));
      const pR2 = runJob(makeTimedJob('r2', true, 10));
      const pR3 = runJob(makeTimedJob('r3', true, 20));
      const pW2 = runJob(makeTimedJob('w2', false, 10));
      const pR4 = runJob(makeTimedJob('r4', true, 5));
      const pR5 = runJob(makeTimedJob('r5', true, 5));

      const results = await Promise.all([pW1, pR1, pR2, pR3, pW2, pR4, pR5]);
      expect(results).toEqual(['w1', 'r1', 'r2', 'r3', 'w2', 'r4', 'r5']);

      // w1 finishes before any reads start
      const w1End = timeline.indexOf('end-w1');
      expect(w1End).toBeLessThan(timeline.indexOf('start-r1'));
      expect(w1End).toBeLessThan(timeline.indexOf('start-r2'));
      expect(w1End).toBeLessThan(timeline.indexOf('start-r3'));

      // r1, r2, r3 all start before any of them finish (concurrent)
      const rStarts = ['start-r1', 'start-r2', 'start-r3'].map((s) => timeline.indexOf(s));
      const rEnds = ['end-r1', 'end-r2', 'end-r3'].map((s) => timeline.indexOf(s));
      for (const rs of rStarts) {
        for (const re of rEnds) {
          expect(rs).toBeLessThan(re);
        }
      }

      // w2 waits for all three reads
      const w2Start = timeline.indexOf('start-w2');
      for (const re of rEnds) {
        expect(re).toBeLessThan(w2Start);
      }

      // r4, r5 run concurrently after w2
      const w2End = timeline.indexOf('end-w2');
      expect(w2End).toBeLessThan(timeline.indexOf('start-r4'));
      expect(w2End).toBeLessThan(timeline.indexOf('start-r5'));
      expect(timeline.indexOf('start-r4')).toBeLessThan(timeline.indexOf('end-r5'));
      expect(timeline.indexOf('start-r5')).toBeLessThan(timeline.indexOf('end-r4'));
    });
  });

  describe('failure cascade with parallel jobs', () => {
    it('should let already-launched parallel siblings finish even when one fails', async () => {
      // Why: once a parallel job is executing it cannot be cancelled; the system must report its outcome
      // Given: a multi-job operation with three parallelizable jobs, where the second one rejects
      // When: all three are launched concurrently before the rejection is processed
      // Then: the operation fails, but the first and third jobs succeed because they were already in-flight
      const store = useJobStore.getState();

      const job1 = store.createJob(makeConfig({ command: 'read-ok', parallelizable: true }));
      const job2 = store.createJob(makeConfig({
        command: 'read-fail',
        parallelizable: true,
        execute: () => Promise.reject(new Error('fail')),
      }));
      const job3 = store.createJob(makeConfig({ command: 'read-also-ok', parallelizable: true }));

      const op = store.scheduleOperation('multi-read', [job1, job2, job3]);
      await expect(op.deferred.promise).rejects.toThrow('fail');

      const state = useJobStore.getState();
      expect(state.jobs.get(job1.id)?.status).toBe(JobStatus.SUCCEEDED);
      expect(state.jobs.get(job2.id)?.status).toBe(JobStatus.FAILED);
      expect(state.jobs.get(job3.id)?.status).toBe(JobStatus.SUCCEEDED);
    });

    it('should skip a queued write when a preceding parallel read fails in the same operation', async () => {
      // Why: once an operation has failed, remaining jobs must not execute
      // Given: an operation where a parallelizable read fails, and a non-parallelizable write is queued after it
      // When: the write reaches the front of the queue after the read has failed
      // Then: the write is skipped without executing
      const store = useJobStore.getState();

      const readJob = store.createJob(makeConfig({
        command: 'read-fail',
        parallelizable: true,
        execute: () => Promise.reject(new Error('fail')),
      }));
      const writeJob = store.createJob(makeConfig({ command: 'write-skip', parallelizable: false }));

      const op = store.scheduleOperation('mixed-op', [readJob, writeJob]);
      await expect(op.deferred.promise).rejects.toThrow('fail');

      const state = useJobStore.getState();
      expect(state.jobs.get(readJob.id)?.status).toBe(JobStatus.FAILED);
      expect(state.jobs.get(writeJob.id)?.status).toBe(JobStatus.SKIPPED);
    });
  });

  describe('queue lifecycle events', () => {
    it('should fire onFinishQueue after all parallel jobs on a parallel-only channel complete', async () => {
      // Why: the loading spinner and cache refresh hooks depend on onFinishQueue to know when work is done
      // Given: a channel with only parallelizable jobs and no write lock
      // When: all parallel jobs finish executing
      // Then: the onFinishQueue callback is invoked for that channel
      let finishFired = false;
      const unsub = useJobStore.getState().onFinishQueue(() => { finishFired = true; });

      await runJob(makeConfig({ command: 'read-1', parallelizable: true }));
      await runJob(makeConfig({ command: 'read-2', parallelizable: true }));
      await delay(0);

      expect(finishFired).toBe(true);
      unsub();
    });

    it('should include accumulated affected areas in the onFinishQueue payload', async () => {
      // Why: cache invalidation logic needs to know which data areas were touched during the queue batch
      // Given: a parallelizable job that declares it affects LOCAL_BRANCHES
      // When: the job completes and the queue finishes
      // Then: the onFinishQueue callback receives a set containing LOCAL_BRANCHES
      const areas: Set<RepoArea>[] = [];
      const unsub = useJobStore.getState().onFinishQueue((data) => { areas.push(data.affectedAreas); });

      await runJob(
        makeConfig({
          command: 'read-area',
          parallelizable: true,
          affectedAreas: [RepoArea.LOCAL_BRANCHES],
        }),
      );
      await delay(0);

      expect(areas.length).toBeGreaterThanOrEqual(1);
      expect(areas[areas.length - 1]?.has(RepoArea.LOCAL_BRANCHES)).toBe(true);
      unsub();
    });
  });
});

/** Small delay helper for test timing. */
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
