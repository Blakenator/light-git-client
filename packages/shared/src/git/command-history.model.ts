export class CommandHistoryModel {
  public name: string;
  public command: string;
  public errorOutput: string;
  public output: string;
  public executedAt: Date;
  public durationMs: number;
  public isError: boolean;

  constructor(name: string, command: string, errorOutput: string, output: string, executedAt: Date, duration: number, isError: boolean = true) {
    this.name = name;
    this.command = command;
    this.errorOutput = errorOutput;
    this.output = output;
    this.executedAt = executedAt;
    this.durationMs = duration;
    this.isError = isError;
  }
}
