import { calculateGraphBlocks } from './calculateGraphBlocks';

self.onmessage = (e: MessageEvent) => {
  const commits = e.data;
  const result = calculateGraphBlocks(commits);
  self.postMessage(result);
};
