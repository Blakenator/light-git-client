export enum PreCommitStatus {
  Passed = 'Passed',
  Skipped = 'Skipped',
  Failed = 'Failed',
}

export interface PreCommitStatusRule {
  name: string;
  status: PreCommitStatus;
  error?: string;
}

export class PreCommitStatusModel {
  rules: PreCommitStatusRule[];
  note: string;

  constructor(rules: PreCommitStatusRule[], note?: string) {
    this.rules = rules;
    this.note = note;
  }

  isError(): boolean {
    return this.rules.some((rule) => rule.status === PreCommitStatus.Failed);
  }
}
