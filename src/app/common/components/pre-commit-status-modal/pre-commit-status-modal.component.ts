import { Component } from '@angular/core';
import { ModalService } from '../../services/modal.service';
import { GitService } from '../../../services/git.service';
import { PreCommitStatusModel } from '../../../../../shared/PreCommitStatus.model';

@Component({
  selector: 'app-pre-commit-status-modal',
  templateUrl: './pre-commit-status-modal.component.html',
  styleUrls: ['./pre-commit-status-modal.component.scss'],
})
export class PreCommitStatusModalComponent {
  status: PreCommitStatusModel;
  modalId = 'pre-commit';

  constructor(
    private gitService: GitService,
    private modalService: ModalService,
  ) {
    this.gitService.onPreCommitStatus.subscribe((status) => {
      if (status.rules.some((rule) => !rule.passed)) {
        this.status = status;
        this.modalService.setModalVisible(this.modalId, true);
      }
    });
  }

  close() {
    this.status = undefined;
    this.modalService.setModalVisible(this.modalId, false);
  }
}
