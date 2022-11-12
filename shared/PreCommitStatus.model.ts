interface PreCommitStatusRule {
  name: string;
  passed: boolean;
  error?: string;
}

export class PreCommitStatusModel {
  rules: PreCommitStatusRule[];
  note: string;

  constructor(rules: PreCommitStatusRule[], note?: string) {
    this.rules = rules;
    this.note = note;
  }
}
