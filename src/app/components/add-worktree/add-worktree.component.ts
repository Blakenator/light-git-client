import {ApplicationRef, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {GitService} from '../../services/git.service';
import {BranchModel} from '../../../../shared/git/Branch.model';
import {ModalService} from '../../common/services/modal.service';

@Component({
  selector: 'app-add-worktree',
  templateUrl: './add-worktree.component.html',
  styleUrls: ['./add-worktree.component.scss'],
})
export class AddWorktreeComponent implements OnInit {
  filter = '';
  path = '';
  selectedBranch: BranchModel;
  @Input() branches: BranchModel[];
  @Input() uidSalt = '';
  @Output() onAddWorktree = new EventEmitter();
  output: { err: string, out: string, done: boolean }[] = [];
  isLoading = false;
  pathError: string;
  branchError: string;

  constructor(private gitService: GitService,
              private applicationRef: ApplicationRef,
              public modalService: ModalService) {
  }

  ngOnInit() {
  }

  chooseBranch(b: BranchModel) {
    this.selectedBranch = b;
    if (!this.path || !this.path.trim()) {
      this.path = '../' + this.selectedBranch.name.substring(this.selectedBranch.name.lastIndexOf('/') + 1);
    }
  }

  add() {
    if (!this.path || !this.path.trim() || !this.selectedBranch) {
      this.pathError = !this.path || !this.path.trim() ? 'Please enter a path. If the current directory is desired, enter \'./\'' : '';
      this.branchError = !this.selectedBranch ? 'Please select a branch' : '';
      return;
    } else {
      this.pathError = '';
      this.branchError = '';
    }
    this.isLoading = true;
    this.gitService.addWorktree(this.path, this.selectedBranch.name, (out, err, done) => {
      this.output.push({out, err, done});
      if (done && this.output.filter(x => !!x.err).length == 0) {
        this.modalService.setModalVisible('addWorktree' + this.uidSalt, false);
        this.onAddWorktree.emit();
        this.clearModal();
      }
      if (done) {
        this.isLoading = false;
      }
      this.applicationRef.tick();
    });
  }

  cancel() {
    this.modalService.setModalVisible('addWorktree' + this.uidSalt, false);
    this.clearModal();
  }

  private clearModal() {
    this.path = '';
    this.selectedBranch = undefined;
    this.output = [];
    this.isLoading = false;
  }
}
