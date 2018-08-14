diff --git a/git/GitClient.js b/git/GitClient.js
index 9b1dfb5..f0e1ed0 100644
--- a/git/GitClient.js
+++ b/git/GitClient.js
@@ -7,13 +7,20 @@ var path = require("path");
 var CommitSummary_model_1 = require("../shared/CommitSummary.model");
 var command_history_model_1 = require("../shared/command-history.model");
 var worktree_model_1 = require("../shared/worktree.model");
+var logger_1 = require("codelyzer/util/logger");
+var stash_model_1 = require("../shared/stash.model");
 var exec = require('child_process').exec;
 var GitClient = /** @class */ (function () {
-    function GitClient(workingDir, settings) {
+    function GitClient(workingDir) {
         this.workingDir = workingDir;
-        this.settings = settings;
         this.commandHistory = [];
     }
+    GitClient.prototype.getCommitDiff = function (commitHash) {
+        var _this = this;
+        return new Promise(function (resolve, reject) {
+            _this.execute(_this.getGitPath() + ' diff ' + commitHash + "~ " + commitHash, "Get Diff for Commit").then(resolve)["catch"](reject);
+        });
+    };
     GitClient.prototype.getCommandHistory = function () {
         return this.commandHistory;
     };
@@ -33,7 +40,7 @@ var GitClient = /** @class */ (function () {
             var result = new Commit_model_1.CommitModel();
             var promises = [];
             var changeList = /^(.)(.)\s*(.*)$/gm;
-            promises.push(_this.execute(_this.settings.gitPath + "  status --porcelain", "Get Status").then(function (text) {
+            promises.push(_this.execute(_this.getGitPath() + "  status --porcelain", "Get Status").then(function (text) {
                 var match = changeList.exec(text);
                 while (match) {
                     if (match[1] !== Commit_model_1.ChangeType.Untracked && match[1] !== ' ') {
@@ -59,39 +66,39 @@ var GitClient = /** @class */ (function () {
     GitClient.prototype.stage = function (file) {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " add -- " + file, "Stage File").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
+            _this.execute(_this.getGitPath() + " add -- " + file, "Stage File").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
         });
     };
     GitClient.prototype.unstage = function (file) {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " reset -- " + file, "Unstage File").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
+            _this.execute(_this.getGitPath() + " reset -- " + file, "Unstage File").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
         });
     };
     GitClient.prototype.deleteBranch = function (branch) {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " branch -d -- " + branch, "Delete Branch").then(function (text) { return _this.getBranches().then(resolve)["catch"](reject); });
+            _this.execute(_this.getGitPath() + " branch -d -- " + branch, "Delete Branch").then(function (text) { return _this.getBranches().then(resolve)["catch"](reject); });
         });
     };
     GitClient.prototype.deleteWorktree = function (worktree) {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " worktree remove " + worktree, "Delete Worktree").then(function (text) { return _this.getBranches().then(resolve)["catch"](reject); });
+            _this.execute(_this.getGitPath() + " worktree remove " + worktree, "Delete Worktree").then(function (text) { return _this.getBranches().then(resolve)["catch"](reject); });
         });
     };
     GitClient.prototype.openTerminal = function () {
-        this.execute("start " + this.settings.bashPath + " --login", "Open Terminal").then(console.log);
+        this.execute("start " + GitClient.settings.bashPath + " --login", "Open Terminal").then(console.log);
     };
     GitClient.prototype.getDiff = function (unstaged, staged) {
         var _this = this;
         return new Promise(function (resolve, reject) {
             var command = [];
             if (unstaged.trim()) {
-                command.push(_this.settings.gitPath + " diff -- " + unstaged);
+                command.push(_this.getGitPath() + " diff -- " + unstaged);
             }
             if (staged.trim()) {
-                command.push(_this.settings.gitPath + " diff --staged -- " + staged);
+                command.push(_this.getGitPath() + " diff --staged -- " + staged);
             }
             _this.execute(command.join(' && '), "Get Diff").then(resolve)["catch"](reject);
         });
@@ -100,49 +107,70 @@ var GitClient = /** @class */ (function () {
         var _this = this;
         return new Promise(function (resolve, reject) {
             var s = message.replace(/\"/g, "").replace(/\r?\n/g, '" -m "');
-            _this.execute(_this.settings.bashPath + " -c '" + _this.settings.gitPath + "  commit -m \"" + s + "\"" + (push ? "' && " + _this.settings.gitPath + "  push" : ""), "Commit").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
+            _this.execute(_this.getBashedGit() + "  commit -m \"" + s + "\"" + (push ? "' && " + _this.getGitPath() + "  push" : ""), "Commit").then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); });
         });
     };
     GitClient.prototype.checkout = function (tag, toNewBranch, branchName) {
         var _this = this;
         if (branchName === void 0) { branchName = ''; }
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " checkout " + tag + (toNewBranch ? " -b " + (branchName || tag.replace('origin/', '')) : ""), "Checkout")
+            _this.execute(_this.getGitPath() + " checkout " + tag + (toNewBranch ? " -b " + (branchName || tag.replace('origin/', '')) : ""), "Checkout")
                 .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
         });
     };
     GitClient.prototype.undoFileChanges = function (file, revision) {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " checkout " + (revision || 'HEAD') + ' -- ' + file, "Undo File Changes")
+            _this.execute(_this.getGitPath() + " checkout " + (revision || 'HEAD') + ' -- ' + file, "Undo File Changes")
                 .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
         });
     };
     GitClient.prototype.hardReset = function () {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " reset --hard", "Hard Reset/Undo All")
+            _this.execute(_this.getGitPath() + " reset --hard", "Hard Reset/Undo All")
                 .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
         });
     };
     GitClient.prototype.merge = function (file, tool) {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " mergetool --tool=" + (tool || 'meld') + ' ' + file, "Resolve Merge Conflict")
+            _this.execute(_this.getGitPath() + " mergetool --tool=" + (tool || 'meld') + ' ' + file, "Resolve Merge Conflict")
+                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
+        });
+    };
+    GitClient.prototype.stash = function (unstagedOnly) {
+        var _this = this;
+        return new Promise(function (resolve, reject) {
+            _this.execute(_this.getBashedGit() + " stash" + (unstagedOnly ? ' -k -u' : ''), "Stash Changes")
+                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
+        });
+    };
+    GitClient.prototype.applyStash = function (index) {
+        var _this = this;
+        return new Promise(function (resolve, reject) {
+            _this.execute(_this.getBashedGit() + " stash apply --index " + index, "Apply Stashed Changes")
+                .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
+        });
+    };
+    GitClient.prototype.deleteStash = function (index) {
+        var _this = this;
+        return new Promise(function (resolve, reject) {
+            _this.execute(_this.getBashedGit() + " stash drop stash@{" + index + '}', "Delete Stash")
                 .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
         });
     };
     GitClient.prototype.pushBranch = function (branch, force) {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " push origin " + (branch ? branch + ':' + branch : '') + (force ? ' --force' : ''), "Push")
+            _this.execute(_this.getGitPath() + " push origin " + (branch ? branch + ':' + branch : '') + (force ? ' --force' : ''), "Push")
                 .then(function (text) { return _this.getChanges().then(resolve)["catch"](reject); })["catch"](reject);
         });
     };
     GitClient.prototype.pull = function () {
         var _this = this;
         return new Promise(function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " pull", "Pull")
+            _this.execute(_this.getGitPath() + " pull", "Pull")
                 .then(function (text) {
                 console.log(text);
                 _this.getChanges().then(resolve)["catch"](reject);
@@ -154,7 +182,7 @@ var GitClient = /** @class */ (function () {
     GitClient.prototype.getCommitHistory = function () {
         var _this = this;
         return new Promise((function (resolve, reject) {
-            _this.execute(_this.settings.gitPath + " log -n300 --pretty=format:\"||||%H|%an|%ae|%ad|%B\"\n", "Get Commit History").then(function (text) {
+            _this.execute(_this.getGitPath() + " log -n300 --pretty=format:\"||||%H|%an|%ae|%ad|%B\"\n", "Get Commit History").then(function (text) {
                 var result = [];
                 var branchList = /\|\|\|\|(\S+?)\|(.+?)\|(.+?)\|(.+?)\|([^|]*)/g;
                 var match = branchList.exec(text);
@@ -178,7 +206,7 @@ var GitClient = /** @class */ (function () {
             var result = new Repository_model_1.RepositoryModel();
             var promises = [];
             var branchList = /^(\*)?\s*(\S+)\s+(\S+)\s+(\[\s*(\S+?)(\s*:\s*((ahead|behind)\s+(\d+)),?\s*((behind)\s+(\d+))?)?\])?\s*(.*)?$/gm;
-            promises.push(_this.execute(_this.settings.gitPath + " branch -v -v", "Get Local Branches").then(function (text) {
+            promises.push(_this.execute(_this.getGitPath() + " branch -v -v", "Get Local Branches").then(function (text) {
                 var match = branchList.exec(text);
                 while (match) {
                     var branchModel = new Branch_model_1.BranchModel();
@@ -200,7 +228,7 @@ var GitClient = /** @class */ (function () {
                     match = branchList.exec(text);
                 }
             }));
-            promises.push(_this.execute(_this.settings.gitPath + " worktree list --porcelain", "Get Worktrees").then(function (text) {
+            promises.push(_this.execute(_this.getGitPath() + " worktree list --porcelain", "Get Worktrees").then(function (text) {
                 var worktreeList = /^worktree\s+(.+?)$\s*(bare|(HEAD\s+(\S+)$\s*(detached|branch\s+(.+?)$)))/gmi;
                 var match = worktreeList.exec(text);
                 while (match) {
@@ -213,8 +241,21 @@ var GitClient = /** @class */ (function () {
                     match = worktreeList.exec(text);
                 }
             }));
-            promises.push(_this.execute(_this.settings.gitPath + " fetch", "Fetch Remote Branches"));
-            promises.push(_this.execute(_this.settings.gitPath + " branch -r -v -v", "Get Remote Branches").then(function (text) {
+            promises.push(_this.execute(_this.getBashedGit() + " stash list", "Get Stashes").then(function (text) {
+                var stashList = /^stash@{(\d+)}:\s+(WIP on|On)\s+(.+):\s+(\S+)\s+(.*)$/gmi;
+                var match = stashList.exec(text);
+                while (match) {
+                    var stashModel = new stash_model_1.StashModel();
+                    stashModel.index = +match[1];
+                    stashModel.branchName = match[3];
+                    stashModel.stashedAtHash = match[4];
+                    stashModel.message = match[5];
+                    result.stashes.push(stashModel);
+                    match = stashList.exec(text);
+                }
+            }));
+            promises.push(_this.execute(_this.getGitPath() + " fetch", "Fetch Remote Branches"));
+            promises.push(_this.execute(_this.getGitPath() + " branch -r -v -v", "Get Remote Branches").then(function (text) {
                 var match = branchList.exec(text);
                 while (match) {
                     var branchModel = new Branch_model_1.BranchModel();
@@ -229,9 +270,15 @@ var GitClient = /** @class */ (function () {
                 var currentBranchPath = result.localBranches.find(function (x) { return x.isCurrentBranch; }).name;
                 result.worktrees[result.worktrees.findIndex(function (x) { return x.currentBranch == currentBranchPath; })].isCurrent = true;
                 resolve(result);
-            })["catch"](function (ignore) { return reject(result); });
+            })["catch"](function (ignore) { return reject(ignore); });
         }));
     };
+    GitClient.prototype.getBashedGit = function () {
+        return GitClient.settings.bashPath + " -c '" + this.getGitPath();
+    };
+    GitClient.prototype.getGitPath = function () {
+        return GitClient.settings.gitPath.replace(/\s/g, '^ ');
+    };
     GitClient.prototype.execute = function (command, name) {
         var _this = this;
         var start = new Date();
@@ -242,7 +289,7 @@ var GitClient = /** @class */ (function () {
                     resolve(stdout);
                 }
                 else {
-                    console.log("Err: " + error + " | " + stderr);
+                    logger_1.logger.error("Err: " + error + " | " + stderr);
                     reject(stderr);
                 }
             });
diff --git a/git/GitClient.ts b/git/GitClient.ts
index 11d1ef1..c9d2edd 100644
--- a/git/GitClient.ts
+++ b/git/GitClient.ts
@@ -6,13 +6,23 @@ import {CommitSummaryModel} from "../shared/CommitSummary.model";
 import {CommandHistoryModel} from "../shared/command-history.model";
 import {SettingsModel} from "../shared/SettingsModel";
 import {WorktreeModel} from "../shared/worktree.model";
+import {logger} from "codelyzer/util/logger";
+import {StashModel} from "../shared/stash.model";
 
 const exec = require('child_process').exec;
 
 export class GitClient {
+  static logger: Console;
+  static settings: SettingsModel;
   private commandHistory: CommandHistoryModel[] = [];
 
-  constructor(private workingDir: string, public settings: SettingsModel) {
+  constructor(private workingDir: string) {
+  }
+
+  getCommitDiff(commitHash: any): Promise<string> {
+    return new Promise<string>((resolve, reject) => {
+      this.execute(this.getGitPath() + ' diff ' + commitHash + "~ " + commitHash, "Get Diff for Commit").then(resolve).catch(reject);
+    });
   }
 
   getCommandHistory(): CommandHistoryModel[] {
@@ -34,7 +44,7 @@ export class GitClient {
       let result = new CommitModel();
       let promises = [];
       let changeList = /^(.)(.)\s*(.*)$/gm;
-      promises.push(this.execute(this.settings.gitPath + "  status --porcelain", "Get Status").then(text => {
+      promises.push(this.execute(this.getGitPath() + "  status --porcelain", "Get Status").then(text => {
         let match = changeList.exec(text);
         while (match) {
           if (match[1] !== ChangeType.Untracked && match[1] !== ' ') {
@@ -60,40 +70,40 @@ export class GitClient {
 
   stage(file: string) {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " add -- " + file, "Stage File").then(text => this.getChanges().then(resolve).catch(reject));
+      this.execute(this.getGitPath() + " add -- " + file, "Stage File").then(text => this.getChanges().then(resolve).catch(reject));
     });
   }
 
   unstage(file: string) {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " reset -- " + file, "Unstage File").then(text => this.getChanges().then(resolve).catch(reject));
+      this.execute(this.getGitPath() + " reset -- " + file, "Unstage File").then(text => this.getChanges().then(resolve).catch(reject));
     });
   }
 
   deleteBranch(branch: string) {
     return new Promise<RepositoryModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " branch -d -- " + branch, "Delete Branch").then(text => this.getBranches().then(resolve).catch(reject));
+      this.execute(this.getGitPath() + " branch -d -- " + branch, "Delete Branch").then(text => this.getBranches().then(resolve).catch(reject));
     });
   }
 
   deleteWorktree(worktree: string) {
     return new Promise<RepositoryModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " worktree remove " + worktree, "Delete Worktree").then(text => this.getBranches().then(resolve).catch(reject));
+      this.execute(this.getGitPath() + " worktree remove " + worktree, "Delete Worktree").then(text => this.getBranches().then(resolve).catch(reject));
     });
   }
 
   openTerminal() {
-    this.execute("start " + this.settings.bashPath + " --login", "Open Terminal").then(console.log);
+    this.execute("start " + GitClient.settings.bashPath + " --login", "Open Terminal").then(console.log);
   }
 
   getDiff(unstaged: string, staged: string): Promise<string> {
     return new Promise<string>((resolve, reject) => {
       let command = [];
       if (unstaged.trim()) {
-        command.push(this.settings.gitPath + " diff -- " + unstaged);
+        command.push(this.getGitPath() + " diff -- " + unstaged);
       }
       if (staged.trim()) {
-        command.push(this.settings.gitPath + " diff --staged -- " + staged);
+        command.push(this.getGitPath() + " diff --staged -- " + staged);
       }
       this.execute(command.join(' && '), "Get Diff").then(resolve).catch(reject);
     });
@@ -102,48 +112,69 @@ export class GitClient {
   commit(message: string, push: boolean): Promise<CommitModel> {
     return new Promise<CommitModel>((resolve, reject) => {
       let s = message.replace(/\"/g, "").replace(/\r?\n/g, '" -m "');
-      this.execute(this.settings.bashPath + " -c '" + this.settings.gitPath + "  commit -m \"" + s + "\"" + (push ? "' && " + this.settings.gitPath + "  push" : ""), "Commit").then(text => this.getChanges().then(resolve).catch(reject));
+      this.execute(this.getBashedGit() + "  commit -m \"" + s + "\"" + (push ? "' && " + this.getGitPath() + "  push" : ""), "Commit").then(text => this.getChanges().then(resolve).catch(reject));
     });
   }
 
   checkout(tag: string, toNewBranch: boolean, branchName: string = ''): Promise<CommitModel> {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " checkout " + tag + (toNewBranch ? " -b " + (branchName || tag.replace('origin/', '')) : ""), "Checkout")
+      this.execute(this.getGitPath() + " checkout " + tag + (toNewBranch ? " -b " + (branchName || tag.replace('origin/', '')) : ""), "Checkout")
         .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
     });
   }
 
   undoFileChanges(file: string, revision: string): Promise<CommitModel> {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " checkout " + (revision || 'HEAD') + ' -- ' + file, "Undo File Changes")
+      this.execute(this.getGitPath() + " checkout " + (revision || 'HEAD') + ' -- ' + file, "Undo File Changes")
         .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
     });
   }
 
   hardReset(): Promise<CommitModel> {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " reset --hard", "Hard Reset/Undo All")
+      this.execute(this.getGitPath() + " reset --hard", "Hard Reset/Undo All")
         .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
     });
   }
 
   merge(file: string, tool: string): Promise<CommitModel> {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " mergetool --tool=" + (tool || 'meld') + ' ' + file, "Resolve Merge Conflict")
+      this.execute(this.getGitPath() + " mergetool --tool=" + (tool || 'meld') + ' ' + file, "Resolve Merge Conflict")
+        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
+    });
+  }
+
+  stash(unstagedOnly: boolean): Promise<CommitModel> {
+    return new Promise<CommitModel>((resolve, reject) => {
+      this.execute(this.getBashedGit() + " stash" + (unstagedOnly ? ' -k -u' : ''), "Stash Changes")
+        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
+    });
+  }
+
+  applyStash(index: number): Promise<CommitModel> {
+    return new Promise<CommitModel>((resolve, reject) => {
+      this.execute(this.getBashedGit() + " stash apply --index " + index, "Apply Stashed Changes")
+        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
+    });
+  }
+
+  deleteStash(index: number): Promise<CommitModel> {
+    return new Promise<CommitModel>((resolve, reject) => {
+      this.execute(this.getBashedGit() + " stash drop stash@{" + index + '}', "Delete Stash")
         .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
     });
   }
 
   pushBranch(branch: string, force: boolean): Promise<CommitModel> {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " push origin " + (branch ? branch + ':' + branch : '') + (force ? ' --force' : ''), "Push")
+      this.execute(this.getGitPath() + " push origin " + (branch ? branch + ':' + branch : '') + (force ? ' --force' : ''), "Push")
         .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
     });
   }
 
   pull(): Promise<CommitModel> {
     return new Promise<CommitModel>((resolve, reject) => {
-      this.execute(this.settings.gitPath + " pull", "Pull")
+      this.execute(this.getGitPath() + " pull", "Pull")
         .then(text => {
           console.log(text);
           this.getChanges().then(resolve).catch(reject);
@@ -156,7 +187,7 @@ export class GitClient {
 
   getCommitHistory(): Promise<CommitSummaryModel[]> {
     return new Promise<CommitSummaryModel[]>(((resolve, reject) => {
-      this.execute(this.settings.gitPath + " log -n300 --pretty=format:\"||||%H|%an|%ae|%ad|%B\"\n", "Get Commit History").then(text => {
+      this.execute(this.getGitPath() + " log -n300 --pretty=format:\"||||%H|%an|%ae|%ad|%B\"\n", "Get Commit History").then(text => {
         let result = [];
         let branchList = /\|\|\|\|(\S+?)\|(.+?)\|(.+?)\|(.+?)\|([^|]*)/g;
         let match = branchList.exec(text);
@@ -180,7 +211,7 @@ export class GitClient {
       let result = new RepositoryModel();
       let promises = [];
       let branchList = /^(\*)?\s*(\S+)\s+(\S+)\s+(\[\s*(\S+?)(\s*:\s*((ahead|behind)\s+(\d+)),?\s*((behind)\s+(\d+))?)?\])?\s*(.*)?$/gm;
-      promises.push(this.execute(this.settings.gitPath + " branch -v -v", "Get Local Branches").then(text => {
+      promises.push(this.execute(this.getGitPath() + " branch -v -v", "Get Local Branches").then(text => {
         let match = branchList.exec(text);
         while (match) {
           let branchModel = new BranchModel();
@@ -202,7 +233,7 @@ export class GitClient {
           match = branchList.exec(text);
         }
       }));
-      promises.push(this.execute(this.settings.gitPath + " worktree list --porcelain", "Get Worktrees").then(text => {
+      promises.push(this.execute(this.getGitPath() + " worktree list --porcelain", "Get Worktrees").then(text => {
         let worktreeList = /^worktree\s+(.+?)$\s*(bare|(HEAD\s+(\S+)$\s*(detached|branch\s+(.+?)$)))/gmi;
         let match = worktreeList.exec(text);
         while (match) {
@@ -216,8 +247,22 @@ export class GitClient {
           match = worktreeList.exec(text);
         }
       }));
-      promises.push(this.execute(this.settings.gitPath + " fetch", "Fetch Remote Branches"));
-      promises.push(this.execute(this.settings.gitPath + " branch -r -v -v", "Get Remote Branches").then(text => {
+      promises.push(this.execute(this.getBashedGit() + " stash list", "Get Stashes").then(text => {
+        let stashList = /^stash@{(\d+)}:\s+(WIP on|On)\s+(.+):\s+(\S+)\s+(.*)$/gmi;
+        let match = stashList.exec(text);
+        while (match) {
+          let stashModel = new StashModel();
+          stashModel.index = +match[1];
+          stashModel.branchName = match[3];
+          stashModel.stashedAtHash = match[4];
+          stashModel.message = match[5];
+
+          result.stashes.push(stashModel);
+          match = stashList.exec(text);
+        }
+      }));
+      promises.push(this.execute(this.getGitPath() + " fetch", "Fetch Remote Branches"));
+      promises.push(this.execute(this.getGitPath() + " branch -r -v -v", "Get Remote Branches").then(text => {
         let match = branchList.exec(text);
         while (match) {
           let branchModel = new BranchModel();
@@ -233,10 +278,18 @@ export class GitClient {
         let currentBranchPath = result.localBranches.find(x => x.isCurrentBranch).name;
         result.worktrees[result.worktrees.findIndex(x => x.currentBranch == currentBranchPath)].isCurrent = true;
         resolve(result);
-      }).catch(ignore => reject(result));
+      }).catch(ignore => reject(ignore));
     }));
   }
 
+  private getBashedGit() {
+    return GitClient.settings.bashPath + " -c '" + this.getGitPath();
+  }
+
+  private getGitPath() {
+    return GitClient.settings.gitPath.replace(/\s/g, '^ ');
+  }
+
   private execute(command: string, name: string): Promise<string> {
     let start = new Date();
     return new Promise<string>((resolve, reject) => {
@@ -245,7 +298,7 @@ export class GitClient {
         if (!error) {
           resolve(stdout);
         } else {
-          console.log("Err: " + error + " | " + stderr);
+          logger.error("Err: " + error + " | " + stderr);
           reject(stderr);
         }
       });
diff --git a/main.ts b/main.ts
index 0caa69c..b09c8cb 100644
--- a/main.ts
+++ b/main.ts
@@ -12,10 +12,12 @@ import {ElectronResponse} from "./shared/electron-response";
 const output = fs.createWriteStream(path.join(app.getPath('userData'), 'stdout.log'));
 const errorOutput = fs.createWriteStream(path.join(app.getPath('userData'), 'stderr.log'));
 const logger = new console.Console(output, errorOutput);
+GitClient.logger = logger;
 
 process.on('uncaughtException', function (error) {
-  logger.log(JSON.stringify(error));
-  throw error;
+  logger.error(JSON.stringify(error));
+  console.error(error);
+  // throw error;
 });
 
 const opn = require('opn');
@@ -69,6 +71,7 @@ function getReplyChannel(arg) {
 
 function saveSettings(settingsModel: SettingsModel) {
   Object.assign(settingsModel, settingsModel);
+  GitClient.settings = settingsModel;
   fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsModel), {encoding: 'utf8'});
 }
 
@@ -80,11 +83,13 @@ function loadSettings(callback: Function) {
       }
       const res = Object.assign(new SettingsModel(), JSON.parse(data));
       Object.assign(settings, res);
+      GitClient.settings = res;
       callback(res);
     });
   } else {
     Object.assign(settings, new SettingsModel());
     saveSettings(settings);
+    GitClient.settings = settings;
     callback(settings);
   }
 }
@@ -102,7 +107,7 @@ function stopWatchingSettings() {
 }
 
 function loadRepoInfo(repoPath: string): Promise<RepositoryModel> {
-  gitClients[repoPath] = new GitClient(repoPath, settings);
+  gitClients[repoPath] = new GitClient(repoPath);
   loadedRepos[repoPath] = gitClients[repoPath].openRepo();
   return loadedRepos[repoPath];
 }
@@ -306,6 +311,22 @@ try {
     handleGitPromise(gitClients[args[1]].deleteWorktree(args[2]), event, args);
   });
 
+  ipcMain.on(Channels.COMMITDIFF, (event, args) => {
+    handleGitPromise(gitClients[args[1]].getCommitDiff(args[2]), event, args);
+  });
+
+  ipcMain.on(Channels.STASH, (event, args) => {
+    handleGitPromise(gitClients[args[1]].stash(args[2]), event, args);
+  });
+
+  ipcMain.on(Channels.APPLYSTASH, (event, args) => {
+    handleGitPromise(gitClients[args[1]].applyStash(args[2]), event, args);
+  });
+
+  ipcMain.on(Channels.DELETESTASH, (event, args) => {
+    handleGitPromise(gitClients[args[1]].deleteStash(args[2]), event, args);
+  });
+
   ipcMain.on(Channels.CLOSEWINDOW, (event, args) => {
     win.close();
   });
@@ -323,6 +344,7 @@ try {
   });
 
   ipcMain.on(Channels.LOG, (event, args) => {
+    logger.error(new Date().toLocaleString() + ' ------------------------------------------------');
     logger.error(args[1]);
     defaultReply(event, args);
   });
diff --git a/package.json b/package.json
index 7d94786..c58d513 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "light-git-client",
-  "version": "0.3.3",
+  "version": "0.3.4",
   "description": "A light git client",
   "author": {
     "name": "Blake Stacks",
diff --git a/shared/Channels.ts b/shared/Channels.ts
index 0c1ab0e..8adc631 100644
--- a/shared/Channels.ts
+++ b/shared/Channels.ts
@@ -28,4 +28,8 @@ export namespace Channels {
   export const MINIMIZE = "minimize";
   export const RESTORE = "restoreWindow";
   export const CLOSEWINDOW = "closeWindow";
+  export const COMMITDIFF = "commitDiff";
+  export const STASH = "stash";
+  export const APPLYSTASH = "applyStash";
+  export const DELETESTASH = "deleteStash";
 }
diff --git a/shared/Repository.model.ts b/shared/Repository.model.ts
index 578a121..b84664a 100644
--- a/shared/Repository.model.ts
+++ b/shared/Repository.model.ts
@@ -1,5 +1,6 @@
 import {BranchModel} from "./Branch.model";
 import {WorktreeModel} from "./worktree.model";
+import {StashModel} from "./stash.model";
 
 export class RepositoryModel {
   public name: string;
@@ -9,14 +10,16 @@ export class RepositoryModel {
   public remoteBranches: BranchModel[] = [];
   public localBranches: BranchModel[] = [];
   public worktrees: WorktreeModel[] = [];
+  public stashes: StashModel[] = [];
 
   copy(obj: any | RepositoryModel): RepositoryModel {
     this.name = obj.name;
     this.path = obj.path;
     this.remotes = obj.remotes;
-    this.localBranches = obj.localBranches.map(x => Object.assign(new BranchModel(), x));
-    this.remoteBranches = obj.remoteBranches.map(x => Object.assign(new BranchModel(), x));
-    this.worktrees = obj.worktrees.map(x => Object.assign(new WorktreeModel(), x));
+    this.localBranches = (obj.localBranches || []).map(x => Object.assign(new BranchModel(), x));
+    this.remoteBranches = (obj.remoteBranches || []).map(x => Object.assign(new BranchModel(), x));
+    this.worktrees = (obj.worktrees || []).map(x => Object.assign(new WorktreeModel(), x));
+    this.stashes = (obj.stashes || []).map(x => Object.assign(new WorktreeModel(), x));
     return this;
   }
 }
diff --git a/shared/stash.model.ts b/shared/stash.model.ts
new file mode 100644
index 0000000..00f6f33
--- /dev/null
+++ b/shared/stash.model.ts
@@ -0,0 +1,6 @@
+export class StashModel {
+  public message:string;
+  public stashedAtHash:string;
+  public index:number;
+  public branchName:string;
+}
diff --git a/src/app/app.module.ts b/src/app/app.module.ts
index 7d6ad52..0501eaa 100644
--- a/src/app/app.module.ts
+++ b/src/app/app.module.ts
@@ -25,7 +25,7 @@ import {RepoViewComponent} from './components/repo-view/repo-view.component';
 import {ChangeListComponent} from './components/change-list/change-list.component';
 import {DiffViewerComponent} from './components/diff-viewer/diff-viewer.component';
 import {CommitHistoryComponent} from './components/commit-history/commit-history.component';
-import {ErrorMessageComponent} from './components/error-message/error-message.component';
+import {ErrorMessageComponent} from './components/common/error-message/error-message.component';
 import {NewTabPageComponent} from './components/new-tab-page/new-tab-page.component';
 import {FilterObjectPipe, FilterPipe} from './directives/filter.pipe';
 import {BranchTreeItemComponent} from './components/branch-tree-item/branch-tree-item.component';
diff --git a/src/app/components/branch-tree-item/branch-tree-item.component.html b/src/app/components/branch-tree-item/branch-tree-item.component.html
index 271e9d9..0e70883 100644
--- a/src/app/components/branch-tree-item/branch-tree-item.component.html
+++ b/src/app/components/branch-tree-item/branch-tree-item.component.html
@@ -6,7 +6,7 @@
   <div *ngIf="showChildren" [ngClass]="{children:currentPath}">
     <div *ngFor="let b of leaves | filterObject : 'name' : filter" class="branch">
       <div *ngIf="isLocal">
-      <span [ngClass]="{'bold':b.isCurrentBranch,'text-muted':checkedOutOtherWorktree(b)}">
+        <span [ngClass]="{'bold':b.isCurrentBranch,'text-muted':checkedOutOtherWorktree(b)}">
             {{getLeafName(b.name)}}&nbsp;
             <small *ngIf="checkedOutOtherWorktree(b)"
                    [title]="checkedOutOtherWorktree(b)?'This branch is currently checked out in worktree \''+checkedOutOtherWorktree(b).name+'\'':null">
@@ -15,8 +15,8 @@
             <i *ngIf="b.trackingPath">({{b.trackingPath}})</i>&nbsp;-
             {{b.ahead||0}} <i class="fas fa-arrow-up"></i>
             {{b.behind||0}} <i class="fas fa-arrow-down"></i>
-          </span>
-        <div class="d-inline-block ml-3">
+        </span>
+        <div class="d-inline-block ml-3 float-right">
           <button class="btn btn-light btn-sm"
                   (click)="onCheckoutClicked.emit(b.name)"
                   title="Checkout"
@@ -38,7 +38,7 @@
       </div>
       <div *ngIf="!isLocal">
         <span>{{getLeafName(b.name)}}</span>
-        <div class="d-inline-block ml-3">
+        <div class="d-inline-block ml-3 float-right">
           <button class="btn btn-light btn-sm"
                   (click)="onCheckoutClicked.emit(b.name)"
                   *ngIf="!isRemoteAlreadyCheckedOut(b.name)">
diff --git a/src/app/components/branch-tree-item/branch-tree-item.component.scss b/src/app/components/branch-tree-item/branch-tree-item.component.scss
index 7735723..98bdb66 100644
--- a/src/app/components/branch-tree-item/branch-tree-item.component.scss
+++ b/src/app/components/branch-tree-item/branch-tree-item.component.scss
@@ -14,3 +14,9 @@
 .folder {
   cursor: pointer;
 }
+
+.branch > div::after {
+  clear: both;
+  content: "";
+  display: block;
+}
diff --git a/src/app/components/change-list/change-list.component.html b/src/app/components/change-list/change-list.component.html
index 2f5acf9..0d4610b 100644
--- a/src/app/components/change-list/change-list.component.html
+++ b/src/app/components/change-list/change-list.component.html
@@ -19,7 +19,7 @@
   </thead>
   <tbody>
   <tr *ngFor="let c of changes"
-      (click)="toggleSelect(c.file)"
+      (click)="toggleSelect(c.file,$event)"
       class="change">
     <td>
       <i [ngClass]="{far:true,'fa-check-square':selectedChanges[c.file],'fa-square':!selectedChanges[c.file]}"></i>
diff --git a/src/app/components/change-list/change-list.component.ts b/src/app/components/change-list/change-list.component.ts
index bd1e94b..1555580 100644
--- a/src/app/components/change-list/change-list.component.ts
+++ b/src/app/components/change-list/change-list.component.ts
@@ -15,6 +15,7 @@ export class ChangeListComponent implements OnInit {
   @Output() onDeleteClicked = new EventEmitter<string[]>();
 
   selectAll = false;
+  lastClicked: string;
 
   constructor() {
   }
@@ -63,8 +64,22 @@ export class ChangeListComponent implements OnInit {
     this.onDeleteClicked.emit([file]);
   }
 
-  toggleSelect(file: string) {
+  toggleSelect(file: string, $event: MouseEvent) {
     this.selectedChanges[file] = !this.selectedChanges[file];
+    if (!this.lastClicked) {
+      this.lastClicked = file;
+    } else if (this.selectedChanges[this.lastClicked]) {
+      if ($event.shiftKey) {
+        const lastClickedIndex = this.changes.findIndex(c => c.file == this.lastClicked);
+        const thisClickedIndex = this.changes.findIndex(c => c.file == file);
+        for (let c of this.changes.slice(Math.min(thisClickedIndex, lastClickedIndex), Math.max(thisClickedIndex, lastClickedIndex))) {
+          this.selectedChanges[c.file] = true;
+        }
+      } else {
+        this.lastClicked = file;
+      }
+    }
+    this.selectAll = this.changes.every(x => this.selectedChanges[x.file]);
     this.onSelectChanged.emit();
   }
 }
diff --git a/src/app/components/commit-history/commit-history.component.html b/src/app/components/commit-history/commit-history.component.html
index 4ba6bd0..caf044f 100644
--- a/src/app/components/commit-history/commit-history.component.html
+++ b/src/app/components/commit-history/commit-history.component.html
@@ -6,6 +6,7 @@
     <th>Email</th>
     <th>Date</th>
     <th>Hash</th>
+    <th></th>
   </tr>
   </thead>
   <tbody>
@@ -20,6 +21,11 @@
       {{c.authorDate | date : 'short'}}
     </td>
     <td class="hidden-until-hover" [title]="c.hash">{{c.hash.substr(0,8)}}</td>
+    <td>
+      <button class="btn btn-sm btn-outline-warning" title="View Commit Diff" (click)="getCommitDiff(c)">
+        <i class="fa fa-eye"></i>
+      </button>
+    </td>
   </tr>
   </tbody>
 </table>
diff --git a/src/app/components/commit-history/commit-history.component.scss b/src/app/components/commit-history/commit-history.component.scss
index 819105e..a106401 100644
--- a/src/app/components/commit-history/commit-history.component.scss
+++ b/src/app/components/commit-history/commit-history.component.scss
@@ -22,3 +22,7 @@
     overflow-y: auto;
   }
 }
+
+td .btn {
+  margin: -1.5em 0;
+}
diff --git a/src/app/components/commit-history/commit-history.component.ts b/src/app/components/commit-history/commit-history.component.ts
index b20b628..60385a6 100644
--- a/src/app/components/commit-history/commit-history.component.ts
+++ b/src/app/components/commit-history/commit-history.component.ts
@@ -1,4 +1,4 @@
-import {Component, Input, OnInit} from '@angular/core';
+import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
 import {CommitSummaryModel} from "../../../../shared/CommitSummary.model";
 
 @Component({
@@ -8,6 +8,7 @@ import {CommitSummaryModel} from "../../../../shared/CommitSummary.model";
 })
 export class CommitHistoryComponent implements OnInit {
   @Input() commitHistory: CommitSummaryModel[];
+  @Output() onClickCommitDiff = new EventEmitter<CommitSummaryModel>();
 
   constructor() {
   }
@@ -15,4 +16,7 @@ export class CommitHistoryComponent implements OnInit {
   ngOnInit() {
   }
 
+  getCommitDiff(commit: CommitSummaryModel) {
+    this.onClickCommitDiff.emit(commit);
+  }
 }
diff --git a/src/app/components/common/file-input/file-input.component.html b/src/app/components/common/file-input/file-input.component.html
index ce1f51e..51cbccb 100644
--- a/src/app/components/common/file-input/file-input.component.html
+++ b/src/app/components/common/file-input/file-input.component.html
@@ -2,9 +2,9 @@
   <label>
     {{label}}
     <input class="form-control"
-           [(ngModel)]="filePath.path"
-           (keyup.enter)="onEnterKeyPressed.emit(filePath.path)"
-           (change)="changeFilePath($event)"/>
+           [(ngModel)]="filePath"
+           (keyup.enter)="enterKeyPressed()"
+           (change)="changeFilePath()"/>
   </label>
   <label class="btn btn-light">
     <input class="form-control d-none"
diff --git a/src/app/components/common/file-input/file-input.component.spec.ts b/src/app/components/common/file-input/file-input.component.spec.ts
deleted file mode 100644
index 42822dd..0000000
--- a/src/app/components/common/file-input/file-input.component.spec.ts
+++ /dev/null
@@ -1,25 +0,0 @@
-import { async, ComponentFixture, TestBed } from '@angular/core/testing';
-
-import { FileInputComponent } from './file-input.component';
-
-describe('FileInputComponent', () => {
-  let component: FileInputComponent;
-  let fixture: ComponentFixture<FileInputComponent>;
-
-  beforeEach(async(() => {
-    TestBed.configureTestingModule({
-      declarations: [ FileInputComponent ]
-    })
-    .compileComponents();
-  }));
-
-  beforeEach(() => {
-    fixture = TestBed.createComponent(FileInputComponent);
-    component = fixture.componentInstance;
-    fixture.detectChanges();
-  });
-
-  it('should create', () => {
-    expect(component).toBeTruthy();
-  });
-});
diff --git a/src/app/components/common/file-input/file-input.component.ts b/src/app/components/common/file-input/file-input.component.ts
index 5d875f2..5b467c6 100644
--- a/src/app/components/common/file-input/file-input.component.ts
+++ b/src/app/components/common/file-input/file-input.component.ts
@@ -10,8 +10,10 @@ export class FileInputComponent implements OnInit {
   @Input() allowMultiple = false;
   @Input() filter: string[] = ['*'];
   @Input() label = '';
-  @Input() filePath: { path: string };
+  @Input() removeQuotes = true;
+  @Input() filePath = '';
   @Output() onEnterKeyPressed = new EventEmitter<string>();
+  @Output() onPathChanged = new EventEmitter<string>();
 
   constructor() {
   }
@@ -19,9 +21,18 @@ export class FileInputComponent implements OnInit {
   ngOnInit() {
   }
 
-  changeFilePath($event) {
-    if ($event.target.files.length > 0) {
-      this.filePath.path = Object.values(<{ [key: number]: { path: string } }>$event.target.files).map(x => x.path).join(",");
+  changeFilePath($event?) {
+    if ($event && $event.target.files.length > 0) {
+      this.filePath = Object.values(<{ [key: number]: { path: string } }>$event.target.files).map(x => x.path).join(",");
     }
+    this.onPathChanged.emit(this.getFormattedFile());
+  }
+
+  enterKeyPressed() {
+    this.onEnterKeyPressed.emit(this.getFormattedFile());
+  }
+
+  private getFormattedFile() {
+    return this.removeQuotes ? this.filePath.replace('"', '') : this.filePath;
   }
 }
diff --git a/src/app/components/common/global-error-handler.service.ts b/src/app/components/common/global-error-handler.service.ts
index 385630d..1ed8a7a 100644
--- a/src/app/components/common/global-error-handler.service.ts
+++ b/src/app/components/common/global-error-handler.service.ts
@@ -10,12 +10,12 @@ export class GlobalErrorHandlerService implements ErrorHandler {
   }
 
   handleError(error: any): void {
-    console.log(error);
+    console.error(error);
     const errorText = error.stack || JSON.stringify(error);
     new ElectronService().rpc(Channels.LOG, [errorText]);
-    if ((errorText) != (this.error.stack || JSON.stringify(this.error))) {
-      alert(errorText);
-    }
+    // if ((errorText) != (this.error.stack || JSON.stringify(this.error))) {
+    //   alert(errorText);
+    // }
     this.error = error;
   }
 }
diff --git a/src/app/components/diff-viewer/diff-viewer.component.html b/src/app/components/diff-viewer/diff-viewer.component.html
index 3fd7f0a..ce5ae0a 100644
--- a/src/app/components/diff-viewer/diff-viewer.component.html
+++ b/src/app/components/diff-viewer/diff-viewer.component.html
@@ -1,11 +1,18 @@
 <div>
-  <label>Match on:
-    <select class="form-control" [(ngModel)]="matchingSelection">
-      <option value="words">Words</option>
-      <option value="lines">Lines</option>
-      <option value="none">None</option>
-    </select>
-  </label>
+  <div *ngIf="diffCommitInfo" class="card-body"><p class="text-muted">{{diffCommitInfo.hash}}</p>
+    <p>{{diffCommitInfo.authorName}} &lt;{{diffCommitInfo.authorEmail}}&gt;
+      @ {{diffCommitInfo.authorDate | date : 'short'}} </p>
+    <div>{{diffCommitInfo.message}}</div>
+  </div>
+  <div class="form-inline">
+    <label>Match on:
+      <select class="form-control" [(ngModel)]="matchingSelection">
+        <option value="words">Words</option>
+        <option value="lines">Lines</option>
+        <option value="none">None</option>
+      </select>
+    </label>
+  </div>
 </div>
 <div [innerHtml]="getDiffHtml()" *ngIf="diffString">
 
diff --git a/src/app/components/diff-viewer/diff-viewer.component.scss b/src/app/components/diff-viewer/diff-viewer.component.scss
index e69de29..e755ab6 100644
--- a/src/app/components/diff-viewer/diff-viewer.component.scss
+++ b/src/app/components/diff-viewer/diff-viewer.component.scss
@@ -0,0 +1,8 @@
+.card-body{
+  border-bottom: .1em solid rgba(128,128,128,.3);
+  //margin-bottom: .5em;
+  padding: 1em;
+}
+.form-inline{
+  padding: 1em;
+}
diff --git a/src/app/components/diff-viewer/diff-viewer.component.ts b/src/app/components/diff-viewer/diff-viewer.component.ts
index 3ea1874..64e4a6c 100644
--- a/src/app/components/diff-viewer/diff-viewer.component.ts
+++ b/src/app/components/diff-viewer/diff-viewer.component.ts
@@ -1,4 +1,5 @@
 import {Component, Input, OnInit} from '@angular/core';
+import {CommitSummaryModel} from "../../../../shared/CommitSummary.model";
 
 declare var Diff2Html;
 
@@ -9,6 +10,7 @@ declare var Diff2Html;
 })
 export class DiffViewerComponent implements OnInit {
   @Input() diffString: string;
+  @Input() diffCommitInfo: CommitSummaryModel;
   matchingSelection = "words";
 
   constructor() {
diff --git a/src/app/components/error-message/error-message.component.html b/src/app/components/error-message/error-message.component.html
deleted file mode 100644
index 4c1238d..0000000
--- a/src/app/components/error-message/error-message.component.html
+++ /dev/null
@@ -1,21 +0,0 @@
-<div class="dialog-container" *ngIf="errorMessage&&errorMessage.error">
-  <div class="dialog-window card">
-    <div class="modal-content">
-      <div class="modal-header">
-        <h5 class="modal-title center-text-vertical"><i class="material-icons">error</i> An Error Occurred</h5>
-        <button type="button" class="close" (click)="close()">
-          <i class="material-icons">close</i>
-        </button>
-      </div>
-      <div class="modal-body">
-        <p>An error occurred while executing the command:</p>
-        <pre>
-          {{getErrorMessage()}}
-        </pre>
-      </div>
-      <div class="modal-footer">
-        <button class="btn btn-secondary" (click)="close()">Ok</button>
-      </div>
-    </div>
-  </div>
-</div>
diff --git a/src/app/components/error-message/error-message.component.scss b/src/app/components/error-message/error-message.component.scss
deleted file mode 100644
index 6c26ad8..0000000
--- a/src/app/components/error-message/error-message.component.scss
+++ /dev/null
@@ -1,3 +0,0 @@
-.modal-title .material-icons {
-  color: red;
-}
diff --git a/src/app/components/error-message/error-message.component.ts b/src/app/components/error-message/error-message.component.ts
deleted file mode 100644
index bb9d6e3..0000000
--- a/src/app/components/error-message/error-message.component.ts
+++ /dev/null
@@ -1,25 +0,0 @@
-import {Component, Input, OnInit} from '@angular/core';
-
-@Component({
-  selector: 'app-error-message',
-  templateUrl: './error-message.component.html',
-  styleUrls: ['./error-message.component.scss']
-})
-export class ErrorMessageComponent implements OnInit {
-  @Input() errorMessage: { error: string };
-
-
-  constructor() {
-  }
-
-  ngOnInit() {
-  }
-
-  close() {
-    this.errorMessage.error = '';
-  }
-
-  getErrorMessage() {
-    return typeof this.errorMessage.error == 'object' ? JSON.stringify(this.errorMessage.error) : this.errorMessage.error;
-  }
-}
diff --git a/src/app/components/home/home.component.scss b/src/app/components/home/home.component.scss
index 70748c9..eea9f21 100644
--- a/src/app/components/home/home.component.scss
+++ b/src/app/components/home/home.component.scss
@@ -20,7 +20,7 @@
 }
 
 .navbar {
-  //margin-bottom: 1em;
+  margin-bottom: .2em;
 }
 
 .main-body {
diff --git a/src/app/components/new-tab-page/new-tab-page.component.html b/src/app/components/new-tab-page/new-tab-page.component.html
index 1b4bd55..3da5b1f 100644
--- a/src/app/components/new-tab-page/new-tab-page.component.html
+++ b/src/app/components/new-tab-page/new-tab-page.component.html
@@ -1,5 +1,6 @@
 <app-file-input [label]="'Repo Path'"
                 [filePath]="repoPath"
                 [isFolder]="true"
-                (onEnterKeyPressed)="readyClicked()"></app-file-input>
+                (onEnterKeyPressed)="readyClicked()"
+                (onPathChanged)="repoPath=$event"></app-file-input>
 <button class="btn btn-success" (click)="readyClicked()">Load</button>
diff --git a/src/app/components/new-tab-page/new-tab-page.component.ts b/src/app/components/new-tab-page/new-tab-page.component.ts
index 0c78871..3144c52 100644
--- a/src/app/components/new-tab-page/new-tab-page.component.ts
+++ b/src/app/components/new-tab-page/new-tab-page.component.ts
@@ -6,7 +6,7 @@ import {Component, EventEmitter, OnInit, Output} from '@angular/core';
   styleUrls: ['./new-tab-page.component.scss']
 })
 export class NewTabPageComponent implements OnInit {
-  repoPath = {path:''};
+  repoPath = '';
   @Output() onReady = new EventEmitter<string>();
 
   constructor() {
@@ -16,6 +16,6 @@ export class NewTabPageComponent implements OnInit {
   }
 
   readyClicked() {
-    this.onReady.emit(this.repoPath.path.replace(/["']/g, ''));
+    this.onReady.emit(this.repoPath.replace(/["']/g, ''));
   }
 }
diff --git a/src/app/components/repo-view/repo-view.component.html b/src/app/components/repo-view/repo-view.component.html
index 7101e3e..ae52eff 100644
--- a/src/app/components/repo-view/repo-view.component.html
+++ b/src/app/components/repo-view/repo-view.component.html
@@ -2,12 +2,12 @@
   <title>Light Git - {{repo.name}} - {{getCurrentBranch().name}}</title>
 </head>
 <div *ngIf="repo" (focus)="getFileChanges()" class="row">
-  <div class="col-sm-7 col-md-5 d-flex flex-column ">
+  <div class="col-sm-4 col-md-3 d-flex flex-column ">
     <h1>{{repo.name}}
       <span class="d-inline-block btn-group">
         <button class="btn btn-primary" (click)="openTerminal()"><i class="fas fa-terminal"></i></button>
         <button class="btn btn-info" (click)="openFolder()"><i class="fas fa-folder-open"></i></button>
-        <button class="btn btn-primary" (click)="getFileChanges()"><i class="fas fa-sync-alt"></i></button>
+        <button class="btn btn-primary" (click)="getFileChanges(false)"><i class="fas fa-sync-alt"></i></button>
         <button class="btn btn-warning" (click)="hardReset()">
           <i class="fa fa-undo"></i>
           Undo All
@@ -73,6 +73,34 @@
         </div>
       </div>
     </div>
+    <div class="card">
+      <div class="card-header form-inline" (click)="toggleExpandState('stashes')">
+        <i [ngClass]="{fa:true,'fa-caret-right':!getExpandState('stashes'),'fa-caret-down':getExpandState('stashes')}"></i>
+        Stashes
+        <input class="ml-2 form-control"
+               placeholder="Filter..."
+               [(ngModel)]="stashFilter" (click)="$event.stopPropagation()">
+        <div class="btn-group d-inline-block">
+          <button class="btn btn-sm btn-secondary" title="Stash Unstaged Changes" (click)="stash(true);$event.stopPropagation()"><i class="fa fa-box"></i></button>
+          <button class="btn btn-sm btn-secondary" title="Stash All Changes" (click)="stash(false);$event.stopPropagation()"><i class="fa fa-boxes"></i></button>
+        </div>
+      </div>
+      <div class="card-body" *ngIf="getExpandState('stashes')">
+        <div *ngFor="let s of repo.stashes | filterObject : getStashFilterText : stashFilter">
+          <span>{{s.index}}: {{s.message}}</span>
+          <div class="d-inline-block ml-3">
+            <button class="btn btn-light btn-sm" (click)="applyStash(s.index)" title="Apply Stash">
+              <i class="fa fa-box-open"></i>
+            </button>
+            <button class="btn btn-danger btn-sm" (click)="deleteStash(s.index)" title="Delete Stash">
+              <i class="fa fa-trash"></i>
+            </button>
+          </div>
+        </div>
+      </div>
+    </div>
+  </div>
+  <div class="col-sm-4 col-md-4 d-flex flex-column ">
     <div *ngIf="changes" class="flex-grow-1">
       <div class="card">
         <div class="card-header" (click)="toggleExpandState('staged')">
@@ -90,7 +118,7 @@
         <div class="change-body" *ngIf="getExpandState('staged')">
           <app-change-list [changes]="changes.stagedChanges"
                            [selectedChanges]="selectedStagedChanges"
-                           (onSelectChanged)="getFileDiff();showDiff=true"
+                           (onSelectChanged)="selectionChanged()"
                            (onUndoFileClicked)="undoFileChanges($event)"
                            (onMergeClicked)="merge($event)"
                            (onDeleteClicked)="deleteClicked($event)"></app-change-list>
@@ -111,7 +139,7 @@
         <div class="change-body" *ngIf="getExpandState('unstaged')">
           <app-change-list [changes]="changes.unstagedChanges"
                            [selectedChanges]="selectedUnstagedChanges"
-                           (onSelectChanged)="getFileDiff();showDiff=true"
+                           (onSelectChanged)="selectionChanged()"
                            (onUndoFileClicked)="undoFileChanges($event)"
                            (onMergeClicked)="merge($event)"
                            (onDeleteClicked)="deleteBranch($event)"></app-change-list>
@@ -135,7 +163,7 @@
       </div>
     </div>
   </div>
-  <div *ngIf="changes" class="col-sm-5 col-md-7 diff-viewer">
+  <div *ngIf="changes" class="col-sm-4 col-md-5 diff-viewer">
     <div class="card">
       <div class="card-header">
         <div class="pretty p-switch p-fill mx-2">
@@ -148,9 +176,11 @@
       </div>
       <div>
         <div class="card-body" *ngIf="showDiff">
-          <app-diff-viewer [diffString]="diffString"></app-diff-viewer>
+          <app-diff-viewer [diffString]="diffString" [diffCommitInfo]="diffCommitInfo"></app-diff-viewer>
         </div>
-        <app-commit-history [commitHistory]="commitHistory" *ngIf="!showDiff"></app-commit-history>
+        <app-commit-history [commitHistory]="commitHistory"
+                            *ngIf="!showDiff"
+                            (onClickCommitDiff)="viewCommitDiff($event)"></app-commit-history>
       </div>
     </div>
   </div>
diff --git a/src/app/components/repo-view/repo-view.component.scss b/src/app/components/repo-view/repo-view.component.scss
index 691cb8f..592e268 100644
--- a/src/app/components/repo-view/repo-view.component.scss
+++ b/src/app/components/repo-view/repo-view.component.scss
@@ -38,3 +38,19 @@
 .card-header {
   cursor: pointer;
 }
+///////////////////////small///////////////////////
+.card-body{
+  padding: .3em;
+  margin: 0;
+}
+.card-header, .btn {
+  //padding: .3em;
+  margin: 0;
+}
+.card{
+  margin: 0;
+  font-size: .9em;
+}
+.td,.th{
+  padding: .3em;
+}
diff --git a/src/app/components/repo-view/repo-view.component.ts b/src/app/components/repo-view/repo-view.component.ts
index eb00323..5049ead 100644
--- a/src/app/components/repo-view/repo-view.component.ts
+++ b/src/app/components/repo-view/repo-view.component.ts
@@ -17,6 +17,8 @@ import {Channels} from "../../../../shared/Channels";
 import {CommitSummaryModel} from "../../../../shared/CommitSummary.model";
 import {BranchModel} from "../../../../shared/Branch.model";
 import {GlobalErrorHandlerService} from "../common/global-error-handler.service";
+import {StashModel} from "../../../../shared/stash.model";
+import {WorktreeModel} from "../../../../shared/worktree.model";
 
 @Component({
   selector: 'app-repo-view',
@@ -40,6 +42,8 @@ export class RepoViewComponent implements OnInit, OnDestroy {
   isLoading = false;
   @Output() onLoadingChange = new EventEmitter<boolean>();
   worktreeFilter: string;
+  diffCommitInfo: CommitSummaryModel;
+  stashFilter: string;
   private interval;
 
   constructor(private electronService: ElectronService,
@@ -49,6 +53,10 @@ export class RepoViewComponent implements OnInit, OnDestroy {
     this.globalErrorHandlerService = <GlobalErrorHandlerService>errorHandler;
   }
 
+  getStashFilterText(stash: StashModel) {
+    return stash.branchName + stash.message + stash.branchName;
+  }
+
   ngOnInit() {
     this.loadRepo();
   }
@@ -59,8 +67,10 @@ export class RepoViewComponent implements OnInit, OnDestroy {
 
   @HostListener('window:focus', ['$event'])
   onFocus(event: any): void {
-    this.getFileChanges();
-    this.getBranchChanges();
+    if (this.repo) {
+      this.getFileChanges();
+      this.getBranchChanges();
+    }
   }
 
   stageAll() {
@@ -91,8 +101,11 @@ export class RepoViewComponent implements OnInit, OnDestroy {
     this.clearSelectedChanges();
   }
 
-  getFileChanges() {
-    this.electronService.rpc(Channels.GETFILECHANGES, [this.repo.path,]).then(changes => this.handleFileChanges(changes)).catch(err => this.handleErrorMessage(err));
+  getFileChanges(keepDiffCommitSelection: boolean = true) {
+    if (!this.repo) {
+      return;
+    }
+    this.electronService.rpc(Channels.GETFILECHANGES, [this.repo.path,]).then(changes => this.handleFileChanges(changes, keepDiffCommitSelection)).catch(err => this.handleErrorMessage(err));
   }
 
   getBranchChanges() {
@@ -105,12 +118,12 @@ export class RepoViewComponent implements OnInit, OnDestroy {
 
   openTerminal() {
     this.electronService.rpc(Channels.OPENTERMINAL, [this.repo.path,]).then(ignore => {
-    });
+    }).catch(err => this.handleErrorMessage(err));
   }
 
   openFolder(path: string = '') {
     this.electronService.rpc(Channels.OPENFOLDER, [this.repo.path, path]).then(ignore => {
-    });
+    }).catch(err => this.handleErrorMessage(err));
   }
 
   getFileDiff() {
@@ -187,6 +200,15 @@ export class RepoViewComponent implements OnInit, OnDestroy {
     this.clearSelectedChanges();
   }
 
+  stash(onlyUnstaged: boolean) {
+    this.electronService.rpc(Channels.STASH, [this.repo.path, onlyUnstaged]).then(changes => {
+      this.handleFileChanges(changes);
+      this.getBranchChanges();
+    })
+      .catch(err => this.handleErrorMessage(err));
+    this.clearSelectedChanges();
+  }
+
   hardReset() {
     this.electronService.rpc(Channels.HARDRESET, [this.repo.path]).then(changes => this.handleFileChanges(changes))
       .catch(err => this.handleErrorMessage(err));
@@ -228,19 +250,50 @@ export class RepoViewComponent implements OnInit, OnDestroy {
     return this.settingsService.settings.expandStates[key];
   }
 
+  selectionChanged() {
+    this.getFileDiff();
+    this.diffCommitInfo = undefined;
+    this.showDiff = true;
+  }
+
+  viewCommitDiff(commit: CommitSummaryModel) {
+    this.electronService.rpc(Channels.COMMITDIFF, [this.repo.path, commit.hash]).then(diff => {
+      this.diffString = diff;
+      this.showDiff = true;
+      this.diffCommitInfo = commit;
+      this.applicationRef.tick();
+    }).catch(err => this.handleErrorMessage(err));
+  }
+
+  applyStash(index: number) {
+    this.electronService.rpc(Channels.APPLYSTASH, [this.repo.path, index]).then(changes => {
+      this.handleFileChanges(changes);
+      this.getBranchChanges();
+    }).catch(err => this.handleErrorMessage(err));
+    this.clearSelectedChanges();
+  }
+
+  deleteStash(index: number) {
+    this.electronService.rpc(Channels.DELETESTASH, [this.repo.path, index]).then(changes => {
+      this.handleFileChanges(changes);
+      this.getBranchChanges();
+    }).catch(err => this.handleErrorMessage(err));
+    this.clearSelectedChanges();
+  }
+
   private loadRepo(path: string = '') {
     this.repoPath = path || this.repoPath;
     this.electronService.rpc(Channels.LOADREPO, [this.repoPath]).then(repo => {
       this.repo = new RepositoryModel().copy(repo);
-      console.log(this.repo);
-      this.getFileChanges();
+      console.log(repo);
+      this.getFileChanges(false);
       this.getCommitHistory();
       this.applicationRef.tick();
       this.interval = setInterval(() => {
         this.getFileChanges();
         this.getBranchChanges();
       }, 1000 * 60 * 5);
-    });
+    }).catch(err => this.handleErrorMessage(err));
   }
 
   private clearSelectedChanges() {
@@ -248,15 +301,20 @@ export class RepoViewComponent implements OnInit, OnDestroy {
     this.selectedStagedChanges = {};
   }
 
-  private handleFileChanges(changes: CommitModel) {
+  private handleFileChanges(changes: CommitModel, keepDiffCommitSelection: boolean = true) {
     this.changes = Object.assign(new CommitModel(), changes, {description: this.changes ? this.changes.description : ''});
-    this.getFileDiff();
+    if (!keepDiffCommitSelection) {
+      this.getFileDiff();
+      this.diffCommitInfo = undefined;
+    }
     this.applicationRef.tick();
   }
 
   private handleBranchChanges(changes: RepositoryModel) {
     this.repo.localBranches = changes.localBranches.map(b => Object.assign(new BranchModel(), b));
     this.repo.remoteBranches = changes.remoteBranches.map(b => Object.assign(new BranchModel(), b));
+    this.repo.worktrees = changes.worktrees.map(w => Object.assign(new WorktreeModel(), w));
+    this.repo.stashes = changes.stashes.map(s => Object.assign(new StashModel(), s));
     this.applicationRef.tick();
   }
 
diff --git a/src/app/components/settings/settings.component.html b/src/app/components/settings/settings.component.html
index 8865331..6178439 100644
--- a/src/app/components/settings/settings.component.html
+++ b/src/app/components/settings/settings.component.html
@@ -25,8 +25,12 @@
             <label>{{tempSettings.darkMode?'dark':'light'}}</label>
           </div>
         </div>
-        <app-file-input [filePath]="tempSettings.gitPath" [label]="'Git Path'"></app-file-input>
-        <app-file-input [filePath]="tempSettings.bashPath" [label]="'Bash Path'"></app-file-input>
+        <app-file-input [filePath]="tempSettings.gitPath"
+                        (onPathChanged)="tempSettings.gitPath=$event"
+                        [label]="'Git Path'"></app-file-input>
+        <app-file-input [filePath]="tempSettings.bashPath"
+                        (onPathChanged)="tempSettings.bashPath=$event"
+                        [label]="'Bash Path'"></app-file-input>
       </div>
       <div class="modal-body">
         <div class="pretty p-switch p-fill mx-2">
diff --git a/src/app/components/settings/settings.component.ts b/src/app/components/settings/settings.component.ts
index 87b53f5..f04ecde 100644
--- a/src/app/components/settings/settings.component.ts
+++ b/src/app/components/settings/settings.component.ts
@@ -31,6 +31,7 @@ export class SettingsComponent implements OnInit {
   }
 
   saveSettings() {
+    console.log(this.tempSettings);
     this.settingsService.saveSettings(this.tempSettings);
     this.tempSettings = this.settingsService.settings;
     this.showSettingsDialog = false;
