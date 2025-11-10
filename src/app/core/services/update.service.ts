import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly updates = inject(SwUpdate);
  private hasReloaded = false;

  constructor() {
    if (this.updates.isEnabled) {
      this.updates.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe((event) => this.applyUpdate(event));
    }
  }

  /** Optional one-shot check invoked by AppComponent */
  async init(): Promise<void> {
    if (this.updates.isEnabled) {
      try { await this.updates.checkForUpdate(); } catch {}
    }
  }

  private async applyUpdate(event: VersionReadyEvent): Promise<void> {
    console.log('[OMJ] SW update ready:', event.latestVersion.hash);
    try {
      await this.updates.activateUpdate();
      console.log('[OMJ] SW update activated, reloading...');
      this.reloadOnce();
    } catch (err) {
      console.error('[OMJ] SW activation failed', err);
    }
  }

  private reloadOnce(): void {
    if (this.hasReloaded) return;
    this.hasReloaded = true;
    setTimeout(() => document.location.reload(), 300);
  }
}
