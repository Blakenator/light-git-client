import {Component, OnInit} from '@angular/core';
import {ElectronService} from "../../providers/electron.service";
import {SettingsService} from "../../providers/settings.service";
import {RepositoryModel} from "../../../../shared/Repository.model";

@Component({
  selector: 'app-repo-view',
  templateUrl: './repo-view.component.html',
  styleUrls: ['./repo-view.component.scss']
})
export class RepoViewComponent implements OnInit {
  repo: RepositoryModel;

  constructor(private electronService: ElectronService,
              private settingsService: SettingsService) {
  }

  ngOnInit() {
    this.electronService.rpc("loadRepo", [], repo => {
      this.repo = new RepositoryModel().copy(repo);
    });
  }

}
