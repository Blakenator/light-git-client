/**
 * Recalculates git graph visualization data (graphBlockTargets) across an
 * entire commit array. This ensures branch continuity is maintained when
 * commits are loaded incrementally via pagination.
 *
 * The algorithm is identical to the backend's parseCommitString graph logic,
 * but operates on existing commit objects rather than parsing raw text.
 */

interface GraphBlockTarget {
  source: number;
  target: number;
  isCommit: boolean;
  isMerge: boolean;
  branchIndex: number;
}

interface CommitForGraph {
  hash: string;
  parentHashes?: string[];
  parents?: string[];
  graphBlockTargets?: GraphBlockTarget[];
}

/**
 * Computes graphBlockTargets for every commit in the array, maintaining
 * branch/slot continuity across the full list. Returns a new array with
 * the graphBlockTargets field populated (shallow copies of the originals).
 */
export function calculateGraphBlocks<T extends CommitForGraph>(commits: T[]): T[] {
  let currentBranch = 0;
  let stack: { seeking: string; from: number; branchIndex: number }[] = [];

  return commits.map((commit) => {
    const parentHashes = commit.parentHashes || commit.parents || [];
    const graphBlockTargets: GraphBlockTarget[] = [];

    let newIndex = 0;
    // Map from seeking hash -> the newIndex at which it was first encountered.
    // Replaces the previous string[] + indexOf pattern for O(1) lookups.
    const encounteredSeeking = new Map<string, number>();
    let added = false;
    const newStack: { seeking: string; from: number; branchIndex: number }[] = [];

    for (let j = 0; j < stack.length; j++) {
      if (stack[j].seeking !== commit.hash) {
        graphBlockTargets.push({
          target: stack[j].from,
          source: newIndex,
          isCommit: false,
          branchIndex: stack[j].branchIndex,
          isMerge: false,
        });
        encounteredSeeking.set(stack[j].seeking, newIndex);
        newStack.push({ ...stack[j], from: newIndex });
        newIndex++;
      } else if (encounteredSeeking.has(commit.hash)) {
        graphBlockTargets.push({
          target: stack[j].from,
          source: encounteredSeeking.get(commit.hash)!,
          isCommit: true,
          branchIndex: stack[j].branchIndex,
          isMerge: false,
        });
        added = true;
      } else {
        graphBlockTargets.push({
          target: stack[j].from,
          source: newIndex,
          isCommit: true,
          branchIndex: stack[j].branchIndex,
          isMerge: parentHashes.length > 1,
        });
        encounteredSeeking.set(commit.hash, newIndex);
        added = true;
        let useCurrentBranch = true;
        for (const p of parentHashes) {
          if (useCurrentBranch) {
            newStack.push({
              seeking: p,
              from: newIndex,
              branchIndex: stack[j].branchIndex,
            });
            useCurrentBranch = false;
          } else {
            newStack.push({
              seeking: p,
              from: newIndex,
              branchIndex: currentBranch++,
            });
          }
        }
        newIndex++;
      }
    }

    if (!added) {
      const fromIndex = graphBlockTargets.length;
      graphBlockTargets.push({
        target: -1,
        source: fromIndex,
        isCommit: true,
        branchIndex: currentBranch,
        isMerge: parentHashes.length > 1,
      });
      for (const p of parentHashes) {
        newStack.push({
          seeking: p,
          from: fromIndex,
          branchIndex: currentBranch++,
        });
      }
    }

    stack = newStack;
    return { ...commit, graphBlockTargets };
  });
}
