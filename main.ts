import {app} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {GitClient} from './git/GitClient';
import {MainApplication} from './mainApplication';

const output = fs.createWriteStream(path.join(app.getPath('userData'), 'stdout.log'), {flags: 'a'});
const errorOutput = fs.createWriteStream(path.join(app.getPath('userData'), 'stderr.log'), {flags: 'a'});
const logger = new console.Console(output, errorOutput);
GitClient.logger = logger;

process.on('uncaughtException', function (error) {
  logger.error(JSON.stringify(error));
  console.error(error);
  throw error;
});


// no error dialogs shown to users
try {
  new MainApplication(logger).start();
} catch (e) {
  // Catch Error
  // throw e;
  logger.error(e);
  console.error(e);
}
