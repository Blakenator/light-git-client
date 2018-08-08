"use strict";
exports.__esModule = true;
var Repository_model_1 = require("../shared/Repository.model");
var Branch_model_1 = require("../shared/Branch.model");
var Commit_model_1 = require("../shared/Commit.model");
var path = require("path");
var CommitSummary_model_1 = require("../shared/CommitSummary.model");
var command_history_model_1 = require("../shared/command-history.model");
var exec = require('child_process').exec;
var GitClient = /** @class */ (function () {
    function GitClient(workingDir) {
        this.workingDir = workingDir;
        this.commandHistory = [];
    }
    GitClient.prototype.getCommandHistory = function () {
        return this.commandHistory;
    };
    GitClient.prototype.openRepo = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getBranches().then(function (rep) {
                rep.path = _this.workingDir;
                rep.name = path.basename(_this.workingDir);
                resolve(rep);
            })["catch"](reject);
        });
    };
    GitClient.prototype.getChanges = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var result = new Commit_model_1.CommitModel();
            var promises = [];
            var changeList = /^(.)(.)\s*(.*)$/gm;
            promises.push(_this.execute("git status --porcelain", "Get Status").then(function (text) {
                var match = changeList.exec(text);
                while (match) {
                    if (match[1] !== Commit_model_1.ChangeType.Untracked && match[1] !== ' ') {
                        var change = new Commit_model_1.LightChange();
                        change.staged = false;
                        change.file = match[3];
                        change.change = match[1];
                        result.stagedChanges.push(change);
                    }
                    if (match[2] !== ' ') {
                        var change = new Commit_model_1.LightChange();
                        change.staged = false;
                        change.file = match[3];
                        change.change = match[2];
                        result.unstagedChanges.push(change);
                    }
                    match = changeList.exec(text);
                }
            }));
            Promise.all(promises).then(function (ignore) { return resolve(result); })["catch"](function (ignore) { return reject(result); });
        });
    };
    GitClient.prototype.stage = function (file) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.execute("git add " + file, "Stage File").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
        });
    };
    GitClient.prototype.unstage = function (file) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.execute("git undoFileChanges " + file, "Unstage File").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
        });
    };
    GitClient.prototype.openTerminal = function () {
        this.execute("start bash --login", "Open Terminal").then(console.log);
    };
    GitClient.prototype.getDiff = function (unstaged, staged) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.execute("git diff " + unstaged + " && git diff --staged " + staged, "Get Diff").then(resolve)["catch"](reject);
        });
    };
    GitClient.prototype.commit = function (message, push) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var s = message.replace(/\"/g, "").replace(/\r?\n/g, '" -m "');
            _this.execute("sh -c 'git commit -m \"" + s + "\"" + (push ? "' && git push" : ""), "Commit").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
        });
    };
    GitClient.prototype.checkout = function (tag, toNewBranch, branchName) {
        var _this = this;
        if (branchName === void 0) { branchName = ''; }
        return new Promise(function (resolve, reject) {
            _this.execute("git checkout " + tag + (toNewBranch ? " -b " + (branchName || tag.replace('origin/', '')) : ""), "Checkout")
                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
        });
    };
    GitClient.prototype.undoFileChanges = function (file, revision) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.execute("git checkout " + (revision || 'HEAD') + ' -- ' + file, "Undo File Changes")
                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
        });
    };
    GitClient.prototype.hardReset = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.execute("git reset --hard", "Hard Reset/Undo All")
                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
        });
    };
    GitClient.prototype.merge = function (file, tool) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.log("git mergetool --tool=" + (tool || 'meld') + file);
            _this.execute("git mergetool --tool=" + (tool || 'meld') + ' ' + file, "Resolve Merge Conflict")
                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
        });
    };
    GitClient.prototype.pushBranch = function (branch, force) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.execute("git push origin " + (branch ? branch + ':' + branch : '') + (force ? ' --force' : ''), "Push")
                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
        });
    };
    GitClient.prototype.pull = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.execute("git pull", "Pull")
                .then(function (text) {
                console.log(text);
                _this.getChanges().then(resolve)["catch"](reject);
            })["catch"](function (err) {
                _this.getChanges().then(resolve)["catch"](reject);
            });
        });
    };
    GitClient.prototype.getCommitHistory = function () {
        var _this = this;
        return new Promise((function (resolve, reject) {
            _this.execute("git log -n300 --pretty=format:\"||||%H|%an|%ae|%ad|%B\"\n", "Get Commit History").then(function (text) {
                var result = [];
                var branchList = /\|\|\|\|(\S+?)\|(.+?)\|(.+?)\|(.+?)\|([^|]*)/g;
                var match = branchList.exec(text);
                while (match) {
                    var commitSummary = new CommitSummary_model_1.CommitSummaryModel();
                    commitSummary.hash = match[1];
                    commitSummary.authorName = match[2];
                    commitSummary.authorEmail = match[3];
                    commitSummary.authorDate = new Date(Date.parse(match[4]));
                    commitSummary.message = match[5];
                    result.push(commitSummary);
                    match = branchList.exec(text);
                }
                resolve(result);
            });
        }));
    };
    GitClient.prototype.getBranches = function () {
        var _this = this;
        return new Promise((function (resolve, reject) {
            var result = new Repository_model_1.RepositoryModel();
            var promises = [];
            var branchList = /^(\*)?\s*(\S+)\s+(\S+)\s+(\[\s*(\S+?)(\s*:\s*((ahead|behind)\s+(\d+)),?\s*((behind)\s+(\d+))?)?\])?\s*(.*)?$/gm;
            promises.push(_this.execute("git branch -v -v", "Get Local Branches").then(function (text) {
                var match = branchList.exec(text);
                while (match) {
                    var branchModel = new Branch_model_1.BranchModel();
                    branchModel.isCurrentBranch = match[1] == '*';
                    branchModel.name = match[2];
                    branchModel.currentHash = match[3];
                    branchModel.lastCommitText = match[13];
                    branchModel.trackingPath = match[5];
                    if (match[8] === 'ahead') {
                        branchModel.ahead = +match[8];
                        if (match[11] === 'behind') {
                            branchModel.behind = +match[12];
                        }
                    }
                    else if (match[8] === 'behind') {
                        branchModel.behind = +match[9];
                    }
                    result.localBranches.push(branchModel);
                    match = branchList.exec(text);
                }
            }));
            promises.push(_this.execute("git branch -r -v -v", "Get Remote Branches").then(function (text) {
                var match = branchList.exec(text);
                while (match) {
                    var branchModel = new Branch_model_1.BranchModel();
                    branchModel.name = match[2];
                    branchModel.currentHash = match[3];
                    branchModel.lastCommitText = match[13];
                    result.remoteBranches.push(branchModel);
                    match = branchList.exec(text);
                }
            }));
            Promise.all(promises).then(function (ignore) { return resolve(result); })["catch"](function (ignore) { return reject(result); });
        }));
    };
    GitClient.prototype.execute = function (command, name) {
        var _this = this;
        var start = new Date();
        return new Promise(function (resolve, reject) {
            exec(command, { cwd: _this.workingDir }, function (error, stdout, stderr) {
                _this.commandHistory.push(new command_history_model_1.CommandHistoryModel(name, command, stderr, stdout, start, new Date().getTime() - start.getTime()));
                if (!error) {
                    resolve(stdout);
                }
                else {
                    console.log("Err: " + error + " | " + stderr);
                    reject(stderr);
                }
            });
        });
    };
    return GitClient;
}());
exports.GitClient = GitClient;
