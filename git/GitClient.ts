import {RepositoryModel} from "../shared/Repository.model";

const exec = require('child_process').exec;

export class GitClient {

  constructor(private workingDir: string) {
  }

  openRepo(): Promise<RepositoryModel> {
    return new Promise<RepositoryModel>(((resolve, reject) => {
      let result = new RepositoryModel();
      let promises=[];
      promises.push(this.execute("git branch").then(result=>{
        
      }));
    }));
  }

  private execute(command: string,): Promise<string> {
    return new Promise<string>(((resolve, reject) => {
      exec(command, {cwd: this.workingDir}, function (error, stdout, stderr) {
        resolve(stdout);
      });
    }));
  }
}
