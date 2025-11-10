import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventsListComponent } from './features/events/events-list/events-list.component';
import { AboutComponent } from './features/about/about.component';

const routes: Routes = [
  { path: '', component: EventsListComponent },
  { path: 'about', component: AboutComponent },
  { path: '**', redirectTo: '' },
  { path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component')
        .then(m => m.ContactComponent)
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
