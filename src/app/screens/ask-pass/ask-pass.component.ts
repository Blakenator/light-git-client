import {ApplicationRef, Component, OnInit} from '@angular/core';
import {ElectronService} from '../../common/services/electron.service';

@Component({
  selector: 'app-ask-pass',
  templateUrl: './ask-pass.component.html',
  styleUrls: ['./ask-pass.component.scss'],
})
export class AskPassComponent implements OnInit {
  username = '';
  password = '';
  host: string;

  constructor(private electronService: ElectronService, private applicationRef: ApplicationRef) {
  }

  ngOnInit() {
    this.electronService.rpc('getHost', []).then(host => {
      this.host = host;
      this.applicationRef.tick();
    });
  }

  sendCreds() {
    this.electronService.rpc('CRED', [this.username, this.password]);
  }

  needsUsername() {
    return this.host && this.host.indexOf('@') < 0;
  }

  getHostUrl() {
    if (!this.host) {
      return '';
    }
    if (this.needsUsername()) {
      return this.host.replace(/https?:\/\//, '');
    } else {
      return this.host.split('@')[1];
    }
  }

  getUsername() {
    if (this.needsUsername()) {
      return undefined;
    } else {
      return this.host.split('@')[0].replace(/https?:\/\//, '');
    }
  }

  getIcon(url: string) {
    if (url == 'bitbucket.org') {
      return 'fab fa-bitbucket';
    } else if (url == 'github.com') {
      return 'fab fa-github';
    } else if (url == 'gitlab.com') {
      return 'fab fa-gitlab';
    } else {
      return 'fa fa-code-branch';
    }
  }
}
