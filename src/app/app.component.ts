import { Component, OnInit, inject } from '@angular/core';
import { UpdateService } from './core/services/update.service';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentYear = new Date().getFullYear();
  adminNavEnabled = false;

  private readonly activationWindowMs = 3000;
  private activationHits: number[] = [];
  private readonly updateService = inject(UpdateService);
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    this.updateService.init();
  }

  handleBrandActivation(): void {
    const now = Date.now();
    this.activationHits = this.activationHits.filter(ts => now - ts < this.activationWindowMs);
    this.activationHits.push(now);
    if (!this.adminNavEnabled && this.activationHits.length >= 5) {
      this.adminNavEnabled = true;
      this.toast.success('Admin controls unlocked', 2600);
    }
  }
}
