import { useState, useEffect, useRef } from 'react';
import { calculateGraphBlocks } from './calculateGraphBlocks';

/**
 * Offloads calculateGraphBlocks to a Web Worker so the main thread stays
 * responsive while the graph layout is computed. Falls back to synchronous
 * calculation when Workers are unavailable (e.g. SSR / test environments).
 *
 * Returns the commit array with graphBlockTargets populated.
 * While the worker is computing, the previous result is held so the UI
 * doesn't flash empty.
 */
export function useGraphBlocksWorker<T extends { hash: string; parentHashes?: string[]; parents?: string[] }>(
  commits: T[],
): T[] {
  const [result, setResult] = useState<T[]>(() => calculateGraphBlocks(commits));
  const workerRef = useRef<Worker | null>(null);
  const latestRequestId = useRef(0);

  useEffect(() => {
    // Create the worker once on mount
    try {
      workerRef.current = new Worker(
        new URL('./calculateGraphBlocks.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch {
      // Worker creation failed – we'll use the synchronous fallback
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (commits.length === 0) {
      setResult([]);
      return;
    }

    const requestId = ++latestRequestId.current;
    const worker = workerRef.current;

    if (!worker) {
      // Synchronous fallback
      setResult(calculateGraphBlocks(commits));
      return;
    }

    const handler = (e: MessageEvent) => {
      // Only apply the result if this is still the latest request
      if (requestId === latestRequestId.current) {
        setResult(e.data);
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage(commits);

    return () => {
      worker.removeEventListener('message', handler);
    };
  }, [commits]);

  return result;
}
