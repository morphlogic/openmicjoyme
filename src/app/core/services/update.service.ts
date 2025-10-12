import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  // Optional injection so there’s no DI error when SW isn’t registered
  private swUpdate = inject(SwUpdate, { optional: true });

  init() {
    // Bail out if service workers aren’t enabled or provider is absent
    if (!this.swUpdate || !this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe(() => {
      if (confirm('A new version is available. Reload now?')) {
        document.location.reload();
      }
    });

    setInterval(() => this.swUpdate!.checkForUpdate(), 15 * 60 * 1000);
  }
}