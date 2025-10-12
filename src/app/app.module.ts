import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

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

@NgModule({
  declarations: [AppComponent, EventsListComponent, EventCardComponent, AboutComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: true, // or toggle by env if you prefer
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}