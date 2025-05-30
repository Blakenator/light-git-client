import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommandHistoryModel } from '../../../../shared/git/command-history.model';
import { takeUntil } from 'rxjs/operators';
import { GitService } from '../../services/git.service';
import { ErrorModel } from '../../../../shared/common/error.model';
import { JobSchedulerService } from '../../services/job-system/job-scheduler.service';
import { Subject } from 'rxjs';
import { ErrorService } from '../../common/services/error.service';
import { ModalService } from '../../common/services/modal.service';
import { ClipboardService } from '../../services/clipboard.service';

@Component({
  selector: 'app-command-history',
  templateUrl: './command-history.component.html',
  styleUrls: ['./command-history.component.scss'],
})
export class CommandHistoryComponent implements OnInit, OnDestroy {
  @Input() commandHistoryFilter: string;
  @Input() uidSalt: number;
  commandHistory: CommandHistoryModel[];
  private $destroy = new Subject<void>();
  private destroyed = false;
  activeCommand: CommandHistoryModel;

  constructor(
    private gitService: GitService,
    private jobSchedulerService: JobSchedulerService,
    private _changeDetectorRef: ChangeDetectorRef,
    private errorService: ErrorService,
    private modalService: ModalService,
    public clipboardService: ClipboardService,
  ) {
    this.gitService.onCommandHistoryUpdated
      .asObservable()
      .pipe(takeUntil(this.$destroy))
      .subscribe((history) => {
        this.commandHistory = history;
        this.changeDetectorRef.detectChanges();
      });
  }

  get changeDetectorRef(): ChangeDetectorRef {
    if (!this?.destroyed) {
      return this._changeDetectorRef;
    } else {
      return Object.assign({}, this?._changeDetectorRef, {
        detectChanges: () => {},
      });
    }
  }

  ngOnInit(): void {}

  ngOnDestroy() {
    this.destroyed = true;
    this.$destroy.next();
  }

  getCommandHistoryFilterableText(command: CommandHistoryModel) {
    return command.name + command.command;
  }

  handleErrorMessage(error: ErrorModel) {
    this.errorService.receiveError(error);
  }

  getCommandHistory() {
    this.jobSchedulerService
      .scheduleSimpleOperation(this.gitService.getCommandHistory())
      .result.then((history) => {
        this.commandHistory = history;
        this.changeDetectorRef.detectChanges();
      })
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            'Command history component, getCommandHistory',
            'fetching git command history',
            err,
          ),
        ),
      );
  }

  showCommandDetails(command: CommandHistoryModel) {
    this.activeCommand = command;
    this.modalService.setModalVisible('commandViewer' + this.uidSalt, true);
  }
}
