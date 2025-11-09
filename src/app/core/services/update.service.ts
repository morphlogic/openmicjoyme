import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly updates = inject(SwUpdate);

  constructor() {
    if (this.updates.isEnabled) {
      this.updates.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(async (e) => {
          console.log('[OMJ] SW update ready:', e.latestVersion.hash);
          try { await this.updates.activateUpdate(); } catch {}
          setTimeout(() => document.location.reload(), 250);
        });
    }
  }

  /** Optional one-shot check invoked by AppComponent */
  async init(): Promise<void> {
    if (this.updates.isEnabled) {
      try { await this.updates.checkForUpdate(); } catch {}
    }
  }
}
