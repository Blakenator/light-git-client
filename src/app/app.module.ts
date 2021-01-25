import 'zone.js/dist/zone-mix';
import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

import { ElectronService } from './common/services/electron.service';

import { WebviewDirective } from './directives/webview.directive';

import { AppComponent } from './app.component';
import { HomeComponent } from './screens/home/home.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SettingsService } from './services/settings.service';
import { LoadingSpinnerComponent } from './common/components/loading-spinner/loading-spinner.component';
import { RepoViewComponent } from './components/repo-view/repo-view.component';
import { ChangeListComponent } from './components/change-list/change-list.component';
import { DiffViewerComponent } from './components/diff-viewer/diff-viewer.component';
import { CommitHistoryComponent } from './components/commit-history/commit-history.component';
import { ErrorMessageComponent } from './common/components/error-message/error-message.component';
import { NewTabPageComponent } from './components/new-tab-page/new-tab-page.component';
import { FilterObjectPipe, FilterPipe } from './common/pipes/filter.pipe';
import { BranchTreeItemComponent } from './components/branch-tree-item/branch-tree-item.component';
import { FileInputComponent } from './common/components/file-input/file-input.component';
import { GlobalErrorHandlerService } from './common/services/global-error-handler.service';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { InputModalComponent } from './common/components/input-modal/input-modal.component';
import { HIGHLIGHT_OPTIONS, HighlightModule } from 'ngx-highlightjs';
import { AutofocusDirective } from './common/directives/autofocus.directive';
import { CodeWatcherAlertsComponent } from './components/code-watcher-alerts/code-watcher-alerts.component';
import { AddWorktreeComponent } from './components/add-worktree/add-worktree.component';
import { CloneComponent } from './components/clone/clone.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AddSubmoduleComponent } from './components/add-submodule/add-submodule.component';
import { GitGraphCanvasComponent } from './components/git-graph-canvas/git-graph-canvas.component';
import { ModalComponent } from './common/components/modal/modal.component';
import { ConfirmModalComponent } from './common/components/confirm-modal/confirm-modal.component';
import { AskPassComponent } from './screens/ask-pass/ask-pass.component';
import {
  BrowserAnimationsModule,
  NoopAnimationsModule,
} from '@angular/platform-browser/animations';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { LayoutCardComponent } from './components/layout-card/layout-card.component';
import { LayoutCardHeaderComponent } from './components/layout-card/layout-card-header/layout-card-header.component';
import { CodeWatcherConfigComponent } from './components/settings/code-watcher-config/code-watcher-config.component';
import { AlertComponent } from './common/components/alert/alert.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TutorialComponent } from './components/tutorial/tutorial.component';
import { PrettyCheckboxComponent } from './common/components/pretty-checkbox/pretty-checkbox.component';
import { MergeBranchComponent } from './components/merge-branch/merge-branch.component';
import { BranchChooserComponent } from './components/branch-chooser/branch-chooser.component';
import { PruneBranchComponent } from './components/dialogs/prune-branch/prune-branch.component';
import { RestoreStashComponent } from './components/dialogs/restore-stash/restore-stash.component';
import { AgeInfoComponent } from './common/components/age-info/age-info.component';

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
    ModalComponent,
    ErrorMessageComponent,
    NewTabPageComponent,
    FilterPipe,
    FilterObjectPipe,
    BranchTreeItemComponent,
    FileInputComponent,
    InputModalComponent,
    AutofocusDirective,
    CodeWatcherAlertsComponent,
    AddWorktreeComponent,
    CloneComponent,
    AddSubmoduleComponent,
    GitGraphCanvasComponent,
    ConfirmModalComponent,
    AskPassComponent,
    LayoutCardComponent,
    LayoutCardHeaderComponent,
    CodeWatcherConfigComponent,
    AlertComponent,
    TutorialComponent,
    PrettyCheckboxComponent,
    MergeBranchComponent,
    BranchChooserComponent,
    PruneBranchComponent,
    RestoreStashComponent,
    AgeInfoComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    InfiniteScrollModule,
    AppRoutingModule,
    NgbModule,
    HighlightModule,
    NoopAnimationsModule,
    BrowserAnimationsModule,
    ScrollingModule,
    DragDropModule,
  ],
  providers: [
    ElectronService,
    SettingsService,
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandlerService,
    },
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        fullLibraryLoader: () => import('highlight.js'),
      },
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
