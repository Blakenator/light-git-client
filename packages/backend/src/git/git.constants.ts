export const COMMIT_FORMAT = '||||%H|%an|%ae|%ad|%cd|%D|%P|%B\n';
export const BRANCH_FORMAT = '--format=%(HEAD)|%(refname:lstrip=2)|%(objectname)|%(upstream:lstrip=2)|%(upstream:track)|%(committerdate)|%(subject)|||';
export const BRANCH_REGEX = /\s*(\*)?\|(\S+?)\|(\S+?)\|(\S*?)\|(\[(\s*((ahead|behind)\s+(\d+)),?\s*((behind)\s+(\d+))?)?(gone)?\])?\|(.*?)\|(.*)?\|\|\|/gm;
export const WORKTREE_REGEX = /^worktree\s+(.+?)$\s*(bare|(HEAD\s+(\S+)$\s*(detached|branch\s+(.+?))$))/gmi;
