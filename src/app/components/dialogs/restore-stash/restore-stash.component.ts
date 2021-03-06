import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommitSummaryModel} from '../../../../../shared/git/CommitSummary.model';
import {GitService} from '../../../services/git.service';
import {ModalService} from '../../../common/services/modal.service';
import {JobSchedulerService} from '../../../services/job-system/job-scheduler.service';

@Component({
  selector: 'app-restore-stash',
  templateUrl: './restore-stash.component.html',
  styleUrls: ['./restore-stash.component.scss'],
})
export class RestoreStashComponent implements OnInit {
  @Input() repoViewUid: number;

  selectedStash: CommitSummaryModel;
  availableStashes: CommitSummaryModel[];
  modalId: string;
  stashFilter: string;

  constructor(private gitService: GitService, private modalService: ModalService,private jobSchedulerService:JobSchedulerService) {
  }

  ngOnInit() {
    this.modalId = 'restoreDeletedStash' + this.repoViewUid;
    this.modalService.getSetVisibleListener(this.modalId).subscribe(isVisible => {
      if (isVisible) {
       this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getDeletedStashes()).result
            .then(stashes => this.availableStashes = stashes.sort(
              (a, b) => new Date(b.authorDate).getTime() - new Date(a.authorDate).getTime()));
      }
    });
  }

  getStashMessage(stash: CommitSummaryModel) {
    return stash.message;
  }

  restoreStash(){
   this.jobSchedulerService.scheduleSimpleOperation(this.gitService.restoreDeletedStash(this.selectedStash.hash));
  }
}
