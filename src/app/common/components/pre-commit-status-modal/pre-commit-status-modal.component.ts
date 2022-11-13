import { Component } from '@angular/core';
import { ModalService } from '../../services/modal.service';
import { GitService } from '../../../services/git.service';
import {
  PreCommitStatus,
  PreCommitStatusModel,
  PreCommitStatusRule,
} from '../../../../../shared/PreCommitStatus.model';
import { groupBy } from 'lodash';

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
      if (status.rules.some((rule) => rule.status === PreCommitStatus.Failed)) {
        const sortedRules = groupBy(status.rules, 'status') as Record<
          PreCommitStatus,
          PreCommitStatusRule[]
        >;

        this.status = new PreCommitStatusModel(
          [
            ...sortedRules[PreCommitStatus.Failed],
            ...sortedRules[PreCommitStatus.Passed],
            ...sortedRules[PreCommitStatus.Skipped],
          ],
          status.note,
        );
        this.modalService.setModalVisible(this.modalId, true);
      }
    });
  }

  close() {
    this.status = undefined;
    this.modalService.setModalVisible(this.modalId, false);
  }

  getStatusIconClasses(rule: PreCommitStatusRule) {
    return rule.status === PreCommitStatus.Passed
      ? 'text-success fa-check'
      : rule.status === PreCommitStatus.Failed
      ? 'text-danger fa-times-circle'
      : 'fa-forward';
  }
}
