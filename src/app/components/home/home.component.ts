import {ApplicationRef, Component, OnInit} from '@angular/core';
import {ElectronService} from '../../providers/electron.service';
import {HttpClient} from '@angular/common/http';
import {SettingsService} from '../../providers/settings.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isLoading=false;
  constructor(private electronService: ElectronService,
              public settingsService: SettingsService,
              private http: HttpClient,
              private applicationRef: ApplicationRef) {
  }

  ngOnInit() {
  }
}
