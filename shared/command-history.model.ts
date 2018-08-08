export class CommandHistoryModel {
  public name:string;
  public command:string;
  public errorOutput:string;
  public output:string;
  public executedAt:Date;
  public durationMs:number;

  constructor(name: string, command: string, errorOutput: string, output: string,executedAt:Date,duration:number) {
    this.name = name;
    this.command = command;
    this.errorOutput = errorOutput;
    this.output = output;
    this.executedAt=executedAt;
    this.durationMs=duration;
  }
}
