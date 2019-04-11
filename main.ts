import {app, dialog} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {GitClient} from './git/GitClient';
import {AskPassApplication} from './askPassApplication';
import {take} from 'rxjs/operators';
import {MainApplication} from './mainApplication';

const output = fs.createWriteStream(path.join(app.getPath('userData'), 'stdout.log'), {flags: 'a'});
const errorOutput = fs.createWriteStream(path.join(app.getPath('userData'), 'stderr.log'), {flags: 'a'});
const logger = new console.Console(output, errorOutput);
GitClient.logger = logger;

process.on('uncaughtException', (error) => {
  logger.error(JSON.stringify(error));
  console.error(error);

  dialog.showMessageBox({
    type: 'error',
    message: `An error occurred. Please see the log for more details. Message: ${error.message}`,
  }, () => {
    process.exit(-1);
  });
});

function getAskPassInstance(host: string) {
  const askPassApplication = new AskPassApplication(GitClient.logger, host);
  askPassApplication.start();
  return askPassApplication.onLogin.pipe(take(1));
}

// no error dialogs shown to users
try {
  if (process.argv.slice(1).some(x => !!x.match(/Password|Username/))) {
    let text = process.argv[1];
    let needsUsername = text.match(/^Username\s+for\s+'(\S+?)'/m);
    let needsPassword = text.match(/^Password\s+for\s+'(\S+?)'/m);

    if (needsUsername) {
      getAskPassInstance(needsUsername[1]).subscribe(creds => {
        if (creds != null) {
          process.stdout.write(creds.username);
        } else {
          process.exit(-1);
        }
      });
    } else if (needsPassword) {
      getAskPassInstance(needsPassword[1]).subscribe(creds => {
        if (creds != null) {
          process.stdout.write(creds.password);
        } else {
          process.exit(-1);
        }
      });
    }
  } else {
    new MainApplication(logger).start();
  }
} catch (e) {
  // Catch Error
  // throw e;
  logger.error(e);
  console.error(e);
}
