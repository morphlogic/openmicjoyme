import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

import { ServiceWorkerModule } from '@angular/service-worker';

import { EventsListComponent } from './features/events/events-list/events-list.component';
import { EventCardComponent } from './features/events/event-card/event-card.component';
import { AboutComponent } from './features/about/about.component';
import { ContactComponent } from './features/contact/contact.component';
import { ToastContainerComponent } from './core/components/toast-container/toast-container.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';

@NgModule({
  declarations: [AppComponent, EventsListComponent, EventCardComponent, AboutComponent, AdminDashboardComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    ContactComponent,
    ToastContainerComponent,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: true, // or toggle by env if you prefer
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
