import { Component, OnInit } from '@angular/core';
import { JobSchedulerService } from '../../services/job-system/job-scheduler.service';
import { TabDataService } from '../../services/tab-data.service';
import { Job, JobStatus } from '../../services/job-system/models';

@Component({
    selector: 'app-active-jobs',
    templateUrl: './active-jobs.component.html',
    styleUrls: ['./active-jobs.component.scss'],
    standalone: false
})
export class ActiveJobsComponent implements OnInit {
  public queue: Job[] = [];
  public iconMap: Record<JobStatus, string> = {
    [JobStatus.FAILED]: 'times-circle',
    [JobStatus.SUCCEEDED]: 'check-circle',
    [JobStatus.SKIPPED]: 'forward',
    [JobStatus.IN_PROGRESS]: 'hourglass-start',
    [JobStatus.UNSCHEDULED]: 'exclamation-triangle',
    [JobStatus.SCHEDULED]: 'clock',
  };
  public colorMap: Record<JobStatus, string> = {
    [JobStatus.FAILED]: 'text-danger',
    [JobStatus.SUCCEEDED]: 'text-success',
    [JobStatus.SKIPPED]: '',
    [JobStatus.IN_PROGRESS]: '',
    [JobStatus.UNSCHEDULED]: 'text-warning',
    [JobStatus.SCHEDULED]: 'text-muted',
  };

  constructor(
    public tabDataService: TabDataService,
    public jobService: JobSchedulerService,
  ) {}

  ngOnInit(): void {
    this.jobService.onStatusUpdate.subscribe((status) => {
      this.queue = status.get(this.tabDataService.getActiveTab().path) ?? [];
    });
  }
}
