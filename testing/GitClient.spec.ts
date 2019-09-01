import {GitClient} from '../git/GitClient';
import {TestConstants} from './test.constants';
import {DiffHeaderStagedState} from '../shared/git/diff.header.model';

describe('Git Client', () => {
  describe('Parse diff string', () => {
    TestConstants.parseDiffCases.forEach(diffCase => {
      it(diffCase.name, () => {
        const client = new GitClient('');
        const diff = client.parseDiffString(diffCase.content, DiffHeaderStagedState.NONE);

        expect(diff.length).toBe(diffCase.headerCount);
        expect(diff[0].toFilename).toBe(diffCase.toFilename);
        expect(diff[0].fromFilename).toBe(diffCase.fromFilename);
        expect(diff[0].hunks.length).toBe(diffCase.hunkCount);
        for (let i = 0; i < diffCase.hunkData.length; i++) {
          for (let j = 0; j < diffCase.hunkData[i].length; j++) {
            let diffHunkModel = diff[i].hunks[j];
            expect(diffHunkModel.fromStartLine).toBe(diffCase.hunkData[i][j].fromStart);
            expect(diffHunkModel.fromNumLines).toBe(diffCase.hunkData[i][j].fromCount);
            expect(diffHunkModel.toStartLine).toBe(diffCase.hunkData[i][j].toStart);
            expect(diffHunkModel.toNumLines).toBe(diffCase.hunkData[i][j].toCount);
          }
        }
      });
    });
  });

  describe('Parse commit string', () => {
    TestConstants.parseCommitCases.forEach(commitCase => {
      it(commitCase.name, () => {
        const client = new GitClient('');
        const commit = client.parseCommitString(commitCase.content);

        expect(commit.length).toBe(commitCase.commitCount);
        expect(commit[0].message).toBe(commitCase.message);
        expect(commit[0].hash).toBe(commitCase.hash);
        expect(commit[0].authorName).toBe(commitCase.authorName);
        expect(commit[0].authorEmail).toBe(commitCase.authorEmail);
      });
    });
  });
});
