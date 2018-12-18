# Light Git Client
A light, elegant git client

## Installation
[Download from Github](https://github.com/Blakenator/light-git-client/releases/latest)

Options:
* Portable (\*.7zip, \*.zip) - no auto-updates, run the .exe
* Installer (\*-setup-#-#-#.exe) - auto updates, run the .exe to install, then run from start menu

## Background
This is a WIP project to address the following failings of other git clients:
* Aesthetic appeal
* Non-blocking actions
* Additional features
* Reliability

## Key New Features
* Relaxed Material Design
   * Material design, but focused on shape, depth, and separation
   * Reduced use of lines & background-less buttons
   * Thicker lines where possible
* Worktree Support (multiple tabs or within a single tab)
* Submodule Support (add, update)
* Code Watchers - Customizable regex watchers that run before you commit
   * Can be used to prevent:
     * Duplicate lines
     * Poor lambda variable names (` x,y,z => `, What does it mean, Grommit?)
     * Leftover `console.log` lines
     * Gotchas, stupid mistakes, and more!
* Built-in git config editor
* Diff hunks editable, selectable in viewer
   * Why leave the app when you don't have to?
* Git command history
   * Want to learn more console commands?
   * Or just want to see what the application is actually doing?
* Autocomplete on changed filenames & path in commit messages

### TODO:
* Clone &check; (10/1/18)
* Branching visualization
* Tag editor (tags currently visible in commit history)
* Ability to move tabs
* More force- options

## Screenshots
![alt text](https://github.com/Blakenator/light-git-client/raw/master/docs/dark1.png "Dark Main Screen")
![alt text](https://github.com/Blakenator/light-git-client/raw/master/docs/dark2.png "Dark with diff and code watchers")
![alt text](https://github.com/Blakenator/light-git-client/raw/master/docs/dark3.png "Dark with settings menu")
![alt text](https://github.com/Blakenator/light-git-client/raw/master/docs/light1.png "Light with git config screen")
![alt text](https://github.com/Blakenator/light-git-client/raw/master/docs/light2.png "Light Main Screen")
