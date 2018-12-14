import 'zone.js/dist/zone-mix';
import 'reflect-metadata';
import '../polyfills';
import {BrowserModule} from '@angular/platform-browser';
import {ErrorHandler, NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {HttpClient, HttpClientModule} from '@angular/common/http';

import {AppRoutingModule} from './app-routing.module';
// NG Translate
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';

import {ElectronService} from './services/electron.service';

import {WebviewDirective} from './directives/webview.directive';

import {AppComponent} from './app.component';
import {HomeComponent} from './components/home/home.component';
import {SettingsComponent} from './components/settings/settings.component';
import {SettingsService} from './services/settings.service';
import {LoadingSpinnerComponent} from './components/loading-spinner/loading-spinner.component';
import {RepoViewComponent} from './components/repo-view/repo-view.component';
import {ChangeListComponent} from './components/change-list/change-list.component';
import {DiffViewerComponent} from './components/diff-viewer/diff-viewer.component';
import {CommitHistoryComponent} from './components/commit-history/commit-history.component';
import {ErrorMessageComponent} from './components/common/components/error-message/error-message.component';
import {NewTabPageComponent} from './components/new-tab-page/new-tab-page.component';
import {FilterObjectPipe, FilterPipe} from './components/common/pipes/filter.pipe';
import {BranchTreeItemComponent} from './components/branch-tree-item/branch-tree-item.component';
import {FileInputComponent} from './components/common/components/file-input/file-input.component';
import {GlobalErrorHandlerService} from './components/common/services/global-error-handler.service';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {InputModalComponent} from './components/common/components/input-modal/input-modal.component';
import {HighlightModule} from 'ngx-highlightjs';
import {GitConfigComponent} from './components/git-config/git-config.component';
import {AutofocusDirective} from './components/common/directives/autofocus.directive';
import {CodeWatcherAlertsComponent} from './components/code-watcher-alerts/code-watcher-alerts.component';
import {AddWorktreeComponent} from './components/add-worktree/add-worktree.component';
import {CloneComponent} from './components/clone/clone.component';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {AddSubmoduleComponent} from './components/add-submodule/add-submodule.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    WebviewDirective,
    HomeComponent,
    SettingsComponent,
    LoadingSpinnerComponent,
    RepoViewComponent,
    ChangeListComponent,
    DiffViewerComponent,
    CommitHistoryComponent,
    ErrorMessageComponent,
    NewTabPageComponent,
    FilterPipe,
    FilterObjectPipe,
    BranchTreeItemComponent,
    FileInputComponent,
    InputModalComponent,
    GitConfigComponent,
    AutofocusDirective,
    CodeWatcherAlertsComponent,
    AddWorktreeComponent,
    CloneComponent,
    AddSubmoduleComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    InfiniteScrollModule,
    AppRoutingModule,
    NgbModule,
    HighlightModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (HttpLoaderFactory),
        deps: [HttpClient],
      },
    }),
  ],
  providers: [ElectronService, SettingsService,
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandlerService,
    }],
  bootstrap: [AppComponent],
})
export class AppModule {
}
