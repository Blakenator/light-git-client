import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {HomeComponent} from './screens/home/home.component';
import {AskPassComponent} from './screens/ask-pass/ask-pass.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'password',
    component: AskPassComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
