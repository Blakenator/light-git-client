import {RepositoryModel} from '../shared/git/Repository.model';
import {BranchModel} from '../shared/git/Branch.model';
import {ChangeType, CommitModel, LightChange} from '../shared/git/Commit.model';
import * as path from 'path';
import {CommitSummaryModel} from '../shared/git/CommitSummary.model';
import {CommandHistoryModel} from '../shared/git/command-history.model';
import {SettingsModel} from '../shared/SettingsModel';
import {WorktreeModel} from '../shared/git/worktree.model';
import {logger} from 'codelyzer/util/logger';
import {StashModel} from '../shared/git/stash.model';
import {DiffHeaderAction, DiffHeaderModel, DiffHeaderStagedState} from '../shared/git/diff.header.model';
import {ConfigItemModel} from '../shared/git/config-item.model';
import * as fs from 'fs';
import {ErrorModel} from '../shared/common/error.model';
import {DiffHunkModel} from '../shared/git/diff.hunk.model';
import {DiffLineModel, LineState} from '../shared/git/diff.line.model';
import * as serializeError from 'serialize-error';
import {SubmoduleModel} from '../shared/git/submodule.model';
import {app} from 'electron';
import {Observable, Subject} from 'rxjs';
import {exec, spawn} from 'child_process';
import {CommandOutputModel} from '../shared/common/command.output.model';

export class GitClient {
    static logger: Console;
    static settings: SettingsModel;
    private commandHistory: CommandHistoryModel[] = [];
    private commandHistoryListener = new Subject<CommandHistoryModel[]>();

    constructor(private workingDir: string) {
    }

    public get onCommandExecuted() {
        return this.commandHistoryListener.asObservable();
    }

    getCommitDiff(commitHash: string): Promise<DiffHeaderModel[]> {
        return new Promise<DiffHeaderModel[]>((resolve, reject) => {
            this.handleErrorDefault(
                this.execute(this.getGitPath(), [
                    'diff',
                    (GitClient.settings.diffIgnoreWhitespace ? '-w' : ''),
                    commitHash + '~',
                    commitHash,
                ], 'Get Diff for Commit')
                    .then(output => {
                        resolve(this.parseDiffString(output.standardOutput, DiffHeaderStagedState.NONE));
                    }), reject);
        });
    }

    getStashDiff(stashIndex: number): Promise<DiffHeaderModel[]> {
        return new Promise<DiffHeaderModel[]>((resolve, reject) => {
            this.handleErrorDefault(
                this.execute(this.getGitPath(), [
                    'diff',
                    (GitClient.settings.diffIgnoreWhitespace ? '-w' : ''),
                    'stash@{' + stashIndex + '}^!',
                ], 'Get Diff for Stash')
                    .then(output => {
                        resolve(this.parseDiffString(output.standardOutput, DiffHeaderStagedState.NONE));
                    }), reject);
        });
    }

    getBranchPremerge(branchHash: string): Promise<DiffHeaderModel[]> {
        return new Promise<DiffHeaderModel[]>((resolve, reject) => {
            this.handleErrorDefault(
                this.execute(this.getGitPath(), [
                    'diff',
                    (GitClient.settings.diffIgnoreWhitespace ? '-w' : ''),
                    branchHash + '...',
                ], 'Get Premerge Diff')
                    .then(output => {
                        resolve(this.parseDiffString(output.standardOutput, DiffHeaderStagedState.NONE));
                    }), reject);
        });
    }

    getCommandHistory(): Promise<CommandHistoryModel[]> {
        return Promise.resolve(this.commandHistory);
    }

    getConfigItems(): Promise<ConfigItemModel[]> {
        return new Promise<ConfigItemModel[]>((resolve, reject) => {
            this.handleErrorDefault(
                this.execute(this.getGitPath(), ['config', '--list', '--show-origin'], 'Get Config Items')
                    .then(output => {

                        let configItem = /^\s*(.*?)\s+(\S+)=(.*)$/gm;
                        let match = configItem.exec(output.standardOutput);
                        let result: ConfigItemModel[] = [];
                        while (match) {
                            result.push(new ConfigItemModel(match[2], match[3], match[1]));
                            match = configItem.exec(output.standardOutput);
                        }
                        resolve(result);
                    }), reject);
        });
    }

    setConfigItem(item: ConfigItemModel): Promise<ConfigItemModel[]> {
        return new Promise<ConfigItemModel[]>((resolve, reject) => {
            let commandArgs = [
                'config',
                (item.value ? '--replace-all' : ''),
            ];
            if (item.sourceFile.trim()) {
                commandArgs.push('--file');
                commandArgs.push(item.sourceFile.replace(/^.*?:/, ''));
            }
            if (!item.value) {
                commandArgs.push('--unset');
            }
            commandArgs.push(item.key);
            if (item.value) {
                commandArgs.push('' + item.value + '');
            }
            this.handleErrorDefault(
                this.execute(this.getGitPath(), commandArgs, 'Set Config Item')
                    .then(() => this.getConfigItems().then(resolve).catch(err => reject(serializeError(err)))),
                reject);
        });
    }

    openRepo(): Promise<RepositoryModel> {
        return new Promise<RepositoryModel>((resolve, reject) => {
            this.execute(this.getGitPath(), ['rev-parse', '--is-inside-work-tree'], 'Check Is Git Working Tree')
                .then(() => {
                    this.getBranches(this.workingDir).then(rep => {
                        let res = Object.assign(new RepositoryModel(), rep || {});
                        res.name = path.basename(this.workingDir);
                        resolve(res);
                    }).catch(err => reject(serializeError(err)));
                })
                .catch(() => {
                    reject('Not a valid git repository, submodule, or worktree');
                });
        });
    }

    getChanges(): Promise<CommitModel> {
        return new Promise<CommitModel>((resolve, reject) => {
            let result = new CommitModel();
            let changeList = /^(.)(.)\s*(.*)$/gm;
            this.handleErrorDefault(
                this.execute(this.getGitPath(), ['status', '--porcelain'], 'Get Status').then(output => {
                    let match = changeList.exec(output.standardOutput);
                    while (match) {
                        if (match[1] !== ChangeType.Untracked && match[1] !== ' ') {
                            let change = new LightChange();
                            change.staged = false;
                            change.file = match[3];
                            change.change = match[1];
                            result.stagedChanges.push(change);
                        }
                        if (match[2] !== ' ') {
                            let change = new LightChange();
                            change.staged = false;
                            change.file = match[3];
                            change.change = match[2];
                            result.unstagedChanges.push(change);
                        }
                        match = changeList.exec(output.standardOutput);
                    }
                }).then(ignore => resolve(result)), reject);
        });
    }

    stage(files: string[]) {
        return this.simpleOperation(this.getGitPath(), ['add', '--', ...files], 'Stage File');
    }

    unstage(files: string[]) {
        return this.simpleOperation(this.getGitPath(), ['reset', '--', ...files], 'Unstage File');
    }

    setBulkGitSettings(config: { [key: string]: string | number }, useGlobal: boolean) {
        return new Promise<any>((resolve, reject) => {
            this.handleErrorDefault(
                Promise.all(Object.keys(config).map(key => {
                    let value = config[key];
                    if (value === -1) {
                        value = process.argv[0] + ' -a';
                    }
                    return this.execute(this.getGitPath(), [
                        'config',
                        (config[key] ? '--replace-all' : '--unset'),
                        useGlobal ? '--global' : '',
                        key,
                        '' + value,
                    ], 'Set git settings');
                })).then(resolve), reject);
        });
    }

    deleteBranch(branches: BranchModel[]) {
        let locals = branches.filter(b => !b.isRemote);
        let remotes = branches.filter(b => b.isRemote);
        let promises: Promise<void>[] = [];
        if (locals.length > 0) {
            promises.push(this.simpleOperation(
                this.getGitPath(),
                ['branch', '-D', '--'].concat(locals.map(b => b.name)),
                'Delete Branches'));
        }
        if (remotes.length > 0) {
            promises.push(this.simpleOperation(
                this.getGitPath(),
                ['push', 'origin', '--delete', '--'].concat(remotes.map(
                    b => b.name.replace(/^origin\//, ''))),
                'Delete Remote Branches').catch((error: string) => {
                if (!error.match(/To\s+.*\r?\n\s+-\s+\[deleted]/i)) {
                    throw error;
                }
            }));
        }
        return Promise.all(promises);
    }

    mergeBranch(branch: string) {
        return this.simpleOperation(this.getGitPath(), ['merge', '-q', branch], 'Merge Branch into Current Branch');
    }

    changeHunk(filename: string, hunk: DiffHunkModel, changedText: string) {
        return new Promise<void>((resolve, reject) => {
            try {
                fs.readFile(filename, (err, data) => {
                    try {
                        if (err) {
                            reject(serializeError(err));
                            return;
                        }
                        let text = data.toString();
                        let eol = /\r?\n/g;
                        let match = null;
                        let start = 0, end = 0, currentLine = 1;
                        while (match || currentLine == 1) {
                            if (hunk.toStartLine == currentLine) {
                                if (!match) {
                                    start = 0;
                                } else {
                                    start = match.index + match[0].length;
                                }
                            } else if (hunk.toStartLine + hunk.toNumLines == currentLine) {
                                end = match.index;
                                break;
                            }
                            currentLine++;
                            match = eol.exec(text);
                        }
                        if (end == 0) {
                            end = text.length;
                        }
                        let modified = text.substring(0, start) + changedText + text.substring(end);
                        fs.writeFile(filename, modified, (err) => {
                            if (err) {
                                reject(serializeError(err));
                                return;
                            }
                            resolve();
                        });
                    } catch (e) {
                        reject(serializeError(e));
                    }
                });
            } catch (e) {
                reject(serializeError(e));
            }
        });
    }

    fetch() {
        return this.simpleOperation(this.getGitPath(), ['fetch', '-q', '-p'], 'Fetch Remote Branches');
    }

    renameBranch(oldName: string, newName: string) {
        return this.simpleOperation(this.getGitPath(), ['branch', '-m', oldName, newName], 'Rename Branch');
    }

    createBranch(branchName: string) {
        return this.simpleOperation(this.getGitPath(), ['checkout', '-q', '-b', branchName], 'Create Branch');
    }

    deleteWorktree(worktree: string) {
        return this.simpleOperation(this.getGitPath(), ['worktree', 'remove', worktree], 'Delete Worktree');
    }

    openTerminal() {
        let startCommand = 'start "Bash Command Window" ' + this.getBashPath() + ' --login';
        if (process.platform == 'darwin') {
            startCommand = 'open -a Terminal ' + this.workingDir;
        } else if (process.platform != 'win32') {
            startCommand = 'x-terminal-emulator --working-directory=' + this.workingDir;
        }

        exec(startCommand, {cwd: this.workingDir}, (error) => {
            if (error) {
                console.error(JSON.stringify(serializeError(error)));
                logger.error(JSON.stringify(serializeError(error)));
            }
        });
    }

    getDiff(unstaged: string[], staged: string[]): Promise<CommandOutputModel<DiffHeaderModel[]>> {
        return new Promise<CommandOutputModel<DiffHeaderModel[]>>((resolve, reject) => {
            let promises = [];
            let result = new CommandOutputModel<DiffHeaderModel[]>([]);
            if (unstaged && unstaged.length > 0) {
                let command: string = this.getGitPath();
                promises.push(this.execute(command, [
                    'diff',
                    (GitClient.settings.diffIgnoreWhitespace ? '-w' : ''),
                    '--',
                    ...unstaged,
                ], 'Get Unstaged Changes Diff', true)
                                  .then(output => {
                                      result.merge(output);
                                      return this.parseDiffString(
                                          output.standardOutput,
                                          DiffHeaderStagedState.UNSTAGED);
                                  }));
            }
            if (staged && staged.length > 0) {
                let command: string = this.getGitPath();
                promises.push(this.execute(command, [
                    'diff',
                    (GitClient.settings.diffIgnoreWhitespace ? '-w' : ''),
                    '--staged',
                    '--',
                    ...staged,
                ], 'Get Staged Changes Diff', true)
                                  .then(output => {
                                      result.merge(output);
                                      return this.parseDiffString(output.standardOutput, DiffHeaderStagedState.STAGED);
                                  }));
            }
            this.handleErrorDefault(
                Promise.all(promises).then(diffArray => {
                    diffArray.forEach(x => result.content = result.content.concat(x));
                    resolve(result);
                }), reject);
        });
    }

    commit(message: string, push: boolean, branch: BranchModel, amend: boolean) {
        return new Promise<void>((resolve, reject) => {
            let commitFilePath = path.join(app.getPath('userData'), 'commit.msg');
            fs.writeFileSync(commitFilePath, message, {encoding: 'utf8'});
            this.handleErrorDefault(
                this.execute(
                    this.getGitPath(),
                    ['commit', '--file', commitFilePath, (amend ? '--amend' : '')],
                    'Commit')
                    .then(() => {
                        fs.unlinkSync(commitFilePath);
                        if (!push) {
                            resolve();
                        } else {
                            this.pushBranch(branch, false)
                                .then(resolve)
                                .catch(err => reject(serializeError(err)));
                        }
                    }), reject);
        });
    }

    cherryPickCommit(hash: string) {
        return this.simpleOperation(this.getGitPath(), ['cherry-pick', hash], 'Cherry-pick');
    }

    checkout(tag: string, toNewBranch: boolean, branchName: string = '', andPull: boolean) {
        let checkoutOp = this.simpleOperation(this.getGitPath(), [
            'checkout',
            '-q',
            tag,
            (toNewBranch ? '-b' + (branchName || tag.replace('origin/', '')) : ''),
        ], 'Checkout');
        if (andPull) {
            checkoutOp.then(() => {
                return new Promise<void>((resolve, reject) => {
                    setTimeout(() =>
                        this.pull(false).then(() => setTimeout(() => resolve(), 500)).catch(reject), 1000);
                });
            });
        }
        return checkoutOp;
    }

    resolveConflictUsing(file: string, theirs: boolean) {
        return new Promise<void>((resolve, reject) => {
            this.simpleOperation(
                this.getGitPath(),
                ['checkout', '-q', '--' + (theirs ? 'theirs' : 'ours'), '--', file],
                'Resolve File Conflicts')
                .then(() => {
                    this.stage([file]).then(resolve).catch(reject);
                }).catch(error => {
                if (error.toString().match(/(^|\r?\n)warning:\s+((CR)?LF)\s+will\s+be\s+replaced/i)) {
                    this.stage([file]).then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            });
        });
    }

    undoFileChanges(files: string[], revision: string, staged: boolean) {
        if (files.length === 0) {
            return Promise.reject('No files selected');
        }
        if (staged) {
            return this.simpleOperation(
                this.getGitPath(),
                ['checkout', '-q', (revision || 'HEAD'), '--', ...files],
                'Undo File Changes');
        } else {
            return new Promise<void>((resolve, reject) => {
                let args = ['stash', 'push', '--keep-index', '--', ...files];
                this.simpleOperation(this.getGitPath(), args, 'Stash Local File Changes').then(() => {
                    this.deleteStash(0).then(resolve).catch(reject);
                }).catch(error => {
                    if (error.toString().indexOf('fatal: unrecognized input') >= 0 ||
                        error.toString().match(/(^|\r?\n)warning:\s+((CR)?LF)\s+will\s+be\s+replaced/i)) {
                        this.deleteStash(0).then(resolve).catch(reject);
                    } else {
                        reject(error);
                    }
                });
            });
        }
    }

    undoSubmoduleChanges(submodules: SubmoduleModel[]) {
        return Promise.all(submodules.map(s =>
            this.simpleOperation(
                this.getGitPath(),
                ['reset', '--hard'],
                'Undo Submodule File Changes',
                path.join(this.workingDir, s.path))
                .then(() =>
                    this.simpleOperation(
                        this.getGitPath(),
                        ['submodule', 'update', '--recursive', '--init', '--', s.path],
                        'Undo Submodule Commit Changes'))));
    }

    hardReset() {
        return this.simpleOperation(this.getGitPath(), ['reset', '--hard'], 'Hard Reset/Undo All')
                   .then(() => this.simpleOperation(
                       this.getGitPath(),
                       [
                           'submodule', 'foreach', '--recursive', this.getGitPath() +
                       ' reset --hard',
                       ],
                       'Reset All Submodule File Changes'))
                   .then(() => this.updateSubmodules(true));
    }

    merge(file: string, tool: string) {
        return this.simpleOperation(
            this.getGitPath(),
            ['mergetool', '--tool=' + (tool || 'meld'), file],
            'Resolve Merge Conflict');
    }

    stash(unstagedOnly: boolean, stashName: string) {
        let commandArgs = ['stash', 'push'];
        if (unstagedOnly) {
            commandArgs.push('-k');
            commandArgs.push('-u');
        }
        if (stashName) {
            commandArgs.push('-m');
            commandArgs.push(stashName);
        }
        return this.simpleOperation(this.getGitPath(), commandArgs, 'Stash Changes');
    }

    applyStash(index: number) {
        return this.simpleOperation(this.getGitPath(), ['stash', 'apply', '' + index], 'Apply Stashed Changes');
    }

    fastForward(branch: BranchModel) {
        return this.simpleOperation(
            this.getGitPath(),
          ['fetch', '-q', 'origin', branch.trackingPath.replace(/^origin/, '') + ':' + branch.name],
            'Fast-Forward Branch');
    }

    deleteStash(index: number) {
        return this.simpleOperation(this.getGitPath(), ['stash', 'drop', 'stash@{' + index + '}'], 'Delete Stash');
    }

    pushBranch(branch: BranchModel, force: boolean) {
        return this.simpleOperation(this.getGitPath(), [
            'push',
            '-q',
            'origin',
            (!branch.trackingPath ? '-u' : ''),
            (branch ? branch.name + ':' + (branch.trackingPath || branch.name).replace(/^origin\//, '') : ''),
            (force ? ' --force' : ''),
        ], 'Push');
    }

    updateSubmodules(recursive?: boolean, branch?: string) {
        return this.simpleOperation(this.getGitPath(), [
            'submodule',
            'update',
            '-q',
            '--init',
            (recursive ? ' --recursive' : ''),
            '--',
            (branch || '.'),
        ], 'Update Submodule');
    }

    addSubmodule(url: string, path: string) {
        return this.simpleOperation(
            this.getGitPath(),
            ['submodule', 'add', '-q', url, (path || '')],
            'Update Submodule');
    }

    checkGitBashVersions(): Promise<{ bash: boolean, git: boolean }> {
        return new Promise<{ bash: boolean, git: boolean }>((resolve, reject) => {
            let result = {git: false, bash: false};
            let promises = [];
            promises.push(new Promise((resolve1) => {
                try {
                    this.execute(this.getGitPath(), ['--version'], 'Check Git Version')
                        .then(output => {
                            result.git = output.standardOutput &&
                                output.standardOutput.indexOf('git version') >= 0;
                            resolve1();
                        })
                        .catch(error => {
                            result.git = false;
                            resolve1();
                        });
                } catch (e) {
                    result.git = false;
                    resolve1();
                }
            }));

            promises.push(new Promise((resolve1) => {
                try {
                    this.execute(this.getBashPath(), ['--version'], 'Check Bash Version')
                        .then(
                            output => {
                                result.bash = output.standardOutput &&
                                    output.standardOutput.indexOf('GNU bash') >= 0;
                                resolve1();
                            })
                        .catch(() => {
                            result.bash = false;
                            resolve1();
                        });
                } catch (e) {
                    result.bash = false;
                    resolve1();
                }
            }));
            Promise.all(promises).then(() => resolve(result));
        });
    }

    pull(force: boolean) {
        return this.simpleOperation(
            this.getGitPath(),
            ['pull', (force ? ' -f' : ''), (GitClient.settings.rebasePull ? '--rebase' : ''), '-q'],
            'Pull');
    }

    getCommitHistory(count: number, skip: number, activeBranch: string): Promise<CommitSummaryModel[]> {
        return new Promise<CommitSummaryModel[]>(((resolve, reject) => {
            let args = [
                'rev-list',
                '-n',
                (count || 50) + '',
                ' --branches' + (activeBranch ? '=*' + activeBranch : ''),
                ' --remotes' + (activeBranch ? '=*' + activeBranch : ''),
            ];
            args = args.concat([
                '--skip=' + (skip || 0),
                '--pretty=format:||||%H|%an|%ae|%ad|%cd|%D|%P|%B\n',
            ]);
            this.handleErrorDefault(
                this.execute(this.getGitPath(), args, 'Get Commit History')
                    .then(output => {
                        let text = output.standardOutput;
                        let result = this.parseCommitString(text);

                        resolve(result);
                    }), reject);
        }));
    }

    public parseCommitString(text) {
        let result: CommitSummaryModel[] = [];
        let branchList = /commit\s+\S+\s*\r?\n\s*\|\|\|\|(\S+?)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.*?)\|(.+?)\|(.*?(?=(commit\s+\S+\s*\r?\n\s*\|\|\|\||$)))/gs;
        let match = branchList.exec(text);

        let currentBranch = 0;
        let stack: { seeking: string, from: number, branchIndex: number }[] = [];

        while (match) {
            let commitSummary = new CommitSummaryModel();
            commitSummary.hash = match[1];
            commitSummary.authorName = match[2];
            commitSummary.authorEmail = match[3];
            commitSummary.authorDate = new Date(Date.parse(match[4]));
            commitSummary.commitDate = new Date(Date.parse(match[5]));
            if (match[5]) {
                commitSummary.currentTags = match[6].split(',').map(tag => tag.trim()).filter(tag => !!tag);
            }
            commitSummary.message = match[8].trim();

            // git graph
            commitSummary.graphBlockTargets = [];
            commitSummary.parentHashes = match[7].split(/\s/);

            let newIndex = 0;
            let encounteredSeeking: string[] = [];
            let added = false;
            let newStack: { seeking: string, from: number, branchIndex: number }[] = [];
            for (let j = 0; j < stack.length; j++) {
                if (stack[j].seeking != commitSummary.hash) {
                    commitSummary.graphBlockTargets.push({
                        target: stack[j].from,
                        source: newIndex,
                        isCommit: false,
                        branchIndex: stack[j].branchIndex,
                        isMerge: false,
                    });
                    encounteredSeeking.push(stack[j].seeking);
                    newStack.push(Object.assign(stack[j], {from: newIndex}));
                    newIndex++;
                } else if (encounteredSeeking.indexOf(commitSummary.hash) >= 0) {
                    commitSummary.graphBlockTargets.push({
                        target: stack[j].from,
                        source: encounteredSeeking.indexOf(commitSummary.hash),
                        isCommit: true,
                        branchIndex: stack[j].branchIndex,
                        isMerge: false,
                    });
                    added = true;
                } else if (encounteredSeeking.indexOf(commitSummary.hash) < 0) {
                    commitSummary.graphBlockTargets.push({
                        target: stack[j].from,
                        source: newIndex,
                        isCommit: true,
                        branchIndex: stack[j].branchIndex,
                        isMerge: commitSummary.parentHashes.length > 1,
                    });
                    encounteredSeeking.push(stack[j].seeking);
                    added = true;
                    let useCurrentBranch = true;
                    for (let p of commitSummary.parentHashes) {
                        if (useCurrentBranch) {
                            newStack.push({
                                seeking: p,
                                from: newIndex,
                                branchIndex: stack[j].branchIndex,
                            });
                            useCurrentBranch = false;
                        } else {
                            newStack.push({seeking: p, from: newIndex, branchIndex: currentBranch++});
                        }
                    }
                    newIndex++;
                }
            }
            if (!added) {
                let fromIndex = commitSummary.graphBlockTargets.length;
                commitSummary.graphBlockTargets.push({
                    target: -1,
                    source: fromIndex,
                    isCommit: true,
                    branchIndex: currentBranch,
                    isMerge: commitSummary.parentHashes.length > 1,
                });
                for (let p of commitSummary.parentHashes) {
                    newStack.push({seeking: p, from: fromIndex, branchIndex: currentBranch++});
                }
            }
            stack = newStack;
            // end git graph

            result.push(commitSummary);
            match = branchList.exec(text);
        }
        return result;
    }

    addWorktree(location: string,
                branch: string): Observable<CommandEvent> {
        return this.executeLive(
            'Add Worktree',
            this.getGitPath(),
            ['worktree', 'add', location, branch.replace(/^origin\//, '')]);
    }

    clone(location: string, url: string): Observable<CommandEvent> {
        return this.executeLive('Clone Repository', this.getGitPath(), ['clone', url, location]);
    }

    getBranches(repoPath: string): Promise<RepositoryModel> {
        return new Promise<RepositoryModel>(((resolve, reject) => {
            let result = new RepositoryModel();
            result.path = repoPath;
            let promises = [];
            let branchList = /\s*(\*)?\|(\S+?)\|(\S+?)\|(\S*?)\|(\[(\s*((ahead|behind)\s+(\d+)),?\s*((behind)\s+(\d+))?)?(gone)?\])?\|(.*?)\|(.*)?\|\|\|/gm;
            let branchFormat = '--format=%(HEAD)|%(refname:lstrip=2)|%(objectname)|%(upstream:lstrip=2)|%(upstream:track)|%(committerdate)|%(subject)|||';
            promises.push(
                this.execute(this.getGitPath(), ['branch', branchFormat], 'Get Local Branches')
                    .then(output => {
                        let text = output.standardOutput;
                        let match = branchList.exec(text);
                        while (match) {
                            let branchModel = new BranchModel();
                            branchModel.isCurrentBranch = match[1] == '*';
                            branchModel.name = match[2];
                            branchModel.currentHash = match[3];
                            branchModel.trackingPath = match[4];
                            branchModel.isTrackingPathGone = !!match[13];
                            branchModel.isRemote = false;
                            if (match[8] === 'ahead') {
                                branchModel.ahead = +match[9];
                                if (match[11] === 'behind') {
                                    branchModel.behind = +match[12];
                                }
                            } else if (match[8] === 'behind') {
                                branchModel.behind = +match[9];
                            }
                            branchModel.lastCommitDate = match[14];
                            branchModel.lastCommitText = match[15];

                            result.localBranches.push(branchModel);
                            match = branchList.exec(text);
                        }
                    }).catch(err => new ErrorModel('getLocalBranches', 'getting the list of locals', err)));

            promises.push(this.execute(this.getGitPath(), ['branch', '-r', branchFormat], 'Get Remote Branches')
                              .then(output => {
                                  let text = output.standardOutput;
                                  let match = branchList.exec(text);
                                  while (match) {
                                      let branchModel = new BranchModel();
                                      branchModel.name = match[2];
                                      branchModel.currentHash = match[3];
                                      branchModel.lastCommitDate = match[13];
                                      branchModel.lastCommitText = match[14];
                                      branchModel.isRemote = true;

                                      result.remoteBranches.push(branchModel);
                                      match = branchList.exec(text);
                                  }
                              })
                              .catch(err => new ErrorModel(
                                  'getRemoteBranches',
                                  'getting the list of remote branches',
                                  err)));

            promises.push(this.execute(this.getGitPath(), ['worktree', 'list', '--porcelain'], 'Get Worktrees')
                              .then(output => {
                                  let text = output.standardOutput;
                                  let worktreeList = /^worktree\s+(.+?)$\s*(bare|(HEAD\s+(\S+)$\s*(detached|branch\s+(.+?))$))/gmi;
                                  let match = worktreeList.exec(text);
                                  while (match) {
                                      let worktreeModel = new WorktreeModel();
                                      worktreeModel.name = path.basename(match[1]);
                                      worktreeModel.path = match[1];
                                      worktreeModel.currentBranch = (match[6] || '').replace('refs/heads/', '') ||
                                          match[5];
                                      worktreeModel.currentHash = match[4] || match[2];

                                      result.worktrees.push(worktreeModel);
                                      match = worktreeList.exec(text);
                                  }
                              })
                              .catch(err => new ErrorModel('getWorktreeList', 'getting the list of worktrees', err)));

            promises.push(
                this.execute(this.getGitPath(), ['submodule', 'status', '--recursive'], 'Get Submodules')
                    .then(output => {
                        let text = output.standardOutput;
                        let submoduleList = /^\s*(\S+)\s+(\S+)\s+\((\S+)\)\s*$/gmi;
                        let match = submoduleList.exec(text);
                        while (match) {
                            let submoduleModel = new SubmoduleModel();
                            submoduleModel.hash = match[1];
                            submoduleModel.path = match[2];
                            submoduleModel.currentBranch = match[3];

                            result.submodules.push(submoduleModel);
                            match = submoduleList.exec(text);
                        }
                    })
                    .catch(err => new ErrorModel('getSubmoduleList', 'getting the list of submodules', err)));

            promises.push(this.execute(this.getGitPath(), ['stash', 'list'], 'Get Stashes').then(output => {
                let text = output.standardOutput;
                let stashList = /^stash@{(\d+)}:\s+(WIP on|On)\s+(.+):\s+(.*)$/gmi;
                let match = stashList.exec(text);
                while (match) {
                    let stashModel = new StashModel();
                    stashModel.index = +match[1];
                    stashModel.branchName = match[3];
                    stashModel.message = match[4];

                    result.stashes.push(stashModel);
                    match = stashList.exec(text);
                }
            }).catch(err => new ErrorModel('getStashes', 'getting the list of stashes', err)));

            this.handleErrorDefault(Promise.all(promises).then(ignore => {
                let index = result.worktrees.findIndex(x => !path.relative(x.path, this.workingDir));
                if (index >= 0) {
                    result.worktrees[index].isCurrent = true;
                }
                resolve(result);
            }), reject);
        }));
    }

    public parseDiffString(text: string, state: DiffHeaderStagedState): DiffHeaderModel[] {
        let diffHeader = /^diff (--git a\/((\s*\S+)+?) b\/((\s*\S+)+?)|--cc ((\s*\S+)+?))((\r?\n(?!@@|diff).*)+)((\r?\n(?!diff).*)*)/gm;
        let hunk = /\s*@@@?( -(\d+)(,(\d+))?){1,2} \+(\d+)(,(\d+))? @@@?.*\r?\n(((\r?\n)?(?!@@).*)*)/gm;
        let line = /^([+\- ])(.*)$/gm;
        let headerMatch = diffHeader.exec(text);
        let result: DiffHeaderModel[] = [];
        while (headerMatch) {
            let header = new DiffHeaderModel();
            if (headerMatch[7]) {
                header.fromFilename = headerMatch[7];
                header.toFilename = headerMatch[7];
            } else {
                header.fromFilename = headerMatch[3];
                header.toFilename = headerMatch[5];
            }
            header.stagedState = state;
            let extraHeaders = headerMatch[8];
            if (extraHeaders.indexOf('\nrename') >= 0) {
                header.action = DiffHeaderAction.RENAMED;
            } else if (extraHeaders.indexOf('\ncopy') >= 0) {
                header.action = DiffHeaderAction.COPIED;
            } else if (extraHeaders.indexOf('\ndeleted') >= 0) {
                header.action = DiffHeaderAction.DELETED;
            } else if (extraHeaders.indexOf('\nnew file') >= 0) {
                header.action = DiffHeaderAction.ADDED;
            } else {
                header.action = DiffHeaderAction.CHANGED;
            }
            let hunkMatch = hunk.exec(headerMatch[10]);
            while (hunkMatch) {
                let h = new DiffHunkModel();
                let startFrom = +hunkMatch[2];
                let startTo = +hunkMatch[5];
                h.fromStartLine = startFrom;
                h.toStartLine = startTo;
                h.fromNumLines = +(hunkMatch[4] == undefined ? 1 : hunkMatch[4]);
                h.toNumLines = +(hunkMatch[7] == undefined ? 1 : hunkMatch[7]);
                let lineMatch = line.exec(hunkMatch[8]);

                while (lineMatch) {
                    let l = new DiffLineModel();
                    if (lineMatch[1] == ' ') {
                        l.state = LineState.SAME;
                        l.fromLineNumber = startFrom++;
                        l.toLineNumber = startTo++;
                        l.text = lineMatch[2];
                    } else if (lineMatch[1] == '+') {
                        l.state = LineState.ADDED;
                        l.fromLineNumber = startFrom;
                        l.toLineNumber = startTo++;
                        l.text = lineMatch[2];
                    } else {
                        l.state = LineState.REMOVED;
                        l.fromLineNumber = startFrom++;
                        l.toLineNumber = startTo;
                        l.text = lineMatch[2];
                    }

                    h.lines.push(l);
                    lineMatch = line.exec(hunkMatch[8]);
                }
                header.hunks.push(h);
                hunkMatch = hunk.exec(headerMatch[10]);
            }
            result.push(header);
            headerMatch = diffHeader.exec(text);
        }
        return result;
    }

    private getGitPath() {
        return SettingsModel.sanitizePath(GitClient.settings.gitPath);
    }

    private getBashPath() {
        return SettingsModel.sanitizePath(GitClient.settings.bashPath);
    }

    private execute(command: string,
                    args: string[],
                    name: string,
                    ignoreError: boolean = false,
                    workingDir?: string): Promise<CommandOutputModel<void>> {
        let timeoutErrorMessage = 'command timed out (>' +
            GitClient.settings.commandTimeoutSeconds +
            's): ' +
            command +
            ' ' +
            args.join(' ') +
            '\n\nEither adjust the timeout in the Settings menu or ' +
            '\nfind the root cause of the timeout';

        return new Promise<CommandOutputModel<void>>((resolve, reject) => {
            let currentOut = '', currentErr = '';
            let race = setTimeout(() => reject(timeoutErrorMessage), GitClient.settings.commandTimeoutSeconds * 1000);
            this.executeLive(name, command, args, false, workingDir).subscribe(event => {
                clearTimeout(race);
                race = undefined;
                if (event.error) {
                    currentErr += event.error;
                }
                if (event.out) {
                    currentOut += event.out;
                }
                if (!event.done) {
                    race = setTimeout(
                        () => reject(timeoutErrorMessage),
                        GitClient.settings.commandTimeoutSeconds * 1000);
                } else {
                    if (currentErr.split(/\r?\n/).every(x => x.trim().length == 0 || x.trim().startsWith('warning:')) ||
                        ignoreError) {
                        resolve(CommandOutputModel.command(currentOut, currentErr, event.exit));
                    } else {
                        reject(CommandOutputModel.command(currentOut, currentErr, event.exit));
                    }
                }
            });
        });
    }

    private executeLive(commandName: string,
                        command: string,
                        args: string[],
                        includeCommand: boolean = true,
                        workingDir?: string): Observable<CommandEvent> {
        let subject = new Subject<CommandEvent>();
        let start = new Date();
        let stderr = '', stdout = '';
        let safeArgs = args.filter(x => !!x && !!x.toString().trim()).map(x => x.toString().trim());
        if (includeCommand) {
            subject.next(new CommandEvent(command + ' ' + safeArgs.join(' '), undefined, false));
        }

        let progress = spawn(
            command,
            safeArgs,
            {
                cwd: workingDir || this.workingDir,
                env: Object.assign({}, process.env, {GIT_ASKPASS: process.env['GIT_ASKPASS'] || process.argv[0]}),
            });
        progress.stdout.on('data', data => {
            let text = data.toString();
            stdout += text;
            subject.next(new CommandEvent(text, undefined, false));
        });
        progress.stderr.on('data', data => {
            let text = data.toString();
            stderr += text;
            subject.next(new CommandEvent(undefined, text, false));
        });
        progress.on('close', code => {
            subject.next(new CommandEvent(
                undefined,
                code != 0 ? 'Non-zero exit code: ' + code : undefined,
                true,
                code));
            let commandHistoryModel = new CommandHistoryModel(commandName,
                command + ' ' + safeArgs.join(' '),
                stderr,
                stdout,
                start, new Date().getTime() - start.getTime(),
                !!stderr);
            this.commandHistory = this.commandHistory.slice(Math.max(this.commandHistory.length - 300, 0))
                                      .concat(commandHistoryModel);
            this.commandHistoryListener.next(this.commandHistory);
        });
        progress.on('error', () => subject.next(new CommandEvent(undefined, undefined, true, -1)));

        return subject.asObservable();
    }

    private simpleOperation(command: string,
                            args: string[],
                            name: string,
                            workingDir?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.execute(command, args, name, false, workingDir)
                .then(() => resolve())
                .catch((err: CommandOutputModel<void>) => {
                    if (err && err.errorOutput) {
                        reject(err.errorOutput);
                    } else {
                        reject(serializeError(err));
                    }
                });
        });
    }

    private handleErrorDefault<T>(promise: Promise<T>, reject: Function) {
        return promise.catch(err => {
            if (err.message) {
                reject(err.message);
            } else if (err.errorOutput) {
                reject(err.errorOutput);
            } else {
                reject(serializeError(err));
            }
        });
    }
}

class CommandEvent {
    out: string;
    error: string;
    done: boolean;
    exit: number;

    constructor(out: string, error: string, done: boolean, exit: number = 0) {
        this.out = out;
        this.error = error;
        this.done = done;
        this.exit = exit;
    }
}
