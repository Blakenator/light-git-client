export class CommandOutputModel<T = any> {
  public content: T;
  public standardOutput: string;
  public errorOutput: string;
  public exitCode: number;

  constructor(content: T, standardOutput: string = '', errorOutput: string = '', exitCode: number = 0) {
    this.content = content;
    this.standardOutput = standardOutput;
    this.errorOutput = errorOutput;
    this.exitCode = exitCode;
  }

  public static command(standardOutput: string = '', errorOutput: string = '', exitCode: number = 0) {
    let res = new CommandOutputModel<void>(undefined);
    res.standardOutput = standardOutput;
    res.errorOutput = errorOutput;
    res.exitCode = exitCode;
    return res;
  }

  public merge(output: CommandOutputModel<any>) {
    this.standardOutput += output.standardOutput;
    this.errorOutput += output.errorOutput;
    if (!this.exitCode && output.exitCode) {
      this.exitCode = output.exitCode;
    }
  }
}
