import {ApplicationRef, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {GitService} from '../../services/git.service';
import {BranchModel} from '../../../../shared/git/Branch.model';
import {ModalService} from '../../services/modal.service';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-add-worktree',
  templateUrl: './add-worktree.component.html',
  styleUrls: ['./add-worktree.component.scss'],
})
export class AddWorktreeComponent implements OnInit {
  showWindow: Observable<boolean>;
  filter = '';
  path = '';
  selectedBranch: BranchModel;
  @Input() branches: BranchModel[];
  @Input() uidSalt = '';
  @Output() onAddWorktree = new EventEmitter();
  output: { err: string, out: string, done: boolean }[] = [];
  isLoading = false;

  constructor(private gitService: GitService,
              private applicationRef: ApplicationRef,
              public modalService: ModalService) {
    this.showWindow = modalService.registerModal('addWorktree' + this.uidSalt).asObservable();
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
      return;
    }
    this.isLoading = true;
    this.gitService.addWorktree(this.path, this.selectedBranch.name, (out, err, done) => {
      this.output.push({out, err, done});
      if (done && this.output.filter(x => !!x.err).length == 0) {
        this.modalService.setModalVisible('addWorktree', false);
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
    this.modalService.setModalVisible('addWorktree', false);
    this.clearModal();
  }

  private clearModal() {
    this.path = '';
    this.selectedBranch = undefined;
    this.output = [];
    this.isLoading = false;
  }
}
