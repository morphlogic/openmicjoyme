import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { AdminEventSubmission, AdminSubmissionsService } from './admin-submissions.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminSubmissionsService);
  private readonly toast = inject(ToastService);
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  private adminKey: string | null = null;

  readonly loading = signal(false);
  readonly unlocked = signal(false);
  readonly entries = signal<AdminEventSubmission[]>([]);
  readonly authError = signal<string | null>(null);
  readonly hasEntries = computed(() => this.entries().length > 0);

  readonly passcodeForm = this.fb.nonNullable.group({
    passcode: ['', [Validators.required, Validators.minLength(4)]]
  });

  private readonly roleLabels: Record<string, string> = {
    comedian: 'Comedian',
    showrunner: 'Host / MC',
    venueOwner: 'Venue / Show Rep',
    other: 'Comedy Fan'
  };

  private readonly requestLabels: Record<string, string> = {
    added: 'Add new event',
    removed: 'Remove event',
    updated: 'Update details',
    none: 'General request'
  };

  async unlock(): Promise<void> {
    if (this.passcodeForm.invalid) {
      this.passcodeForm.markAllAsTouched();
      return;
    }
    const passcode = this.passcodeForm.controls.passcode.value.trim();
    if (!passcode) return;
    await this.fetchSubmissions(passcode, true);
  }

  async refresh(): Promise<void> {
    if (!this.adminKey) return;
    await this.fetchSubmissions(this.adminKey, false);
  }

  trackBySubmissionId(_index: number, submission: AdminEventSubmission): string {
    return submission.id;
  }

  requestLabel(type: string): string {
    return this.requestLabels[type] || type;
  }

  roleLabel(role: string): string {
    return this.roleLabels[role] || role;
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Not provided';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return this.dateFormatter.format(date);
  }

  cadenceText(entry: AdminEventSubmission): string {
    if (!entry.frequency) return 'Not provided';
    if (entry.frequency === 'monthly') {
      if (entry.monthlyPattern === 'weekday' && entry.monthlyOrdinal && entry.monthlyWeekday) {
        return `Monthly — ${this.capitalize(entry.monthlyOrdinal)} ${this.capitalize(entry.monthlyWeekday)}`;
      }
      if (entry.monthlyPattern === 'date' && entry.monthlyMonthday) {
        return `Monthly — day ${entry.monthlyMonthday}`;
      }
      if (entry.monthlyPattern === 'other' && entry.monthlyOtherText) {
        return `Monthly — ${entry.monthlyOtherText}`;
      }
      return 'Monthly';
    }
    if (entry.frequency === 'weekly') return 'Weekly';
    if (entry.frequency === 'one_time') return 'One time';
    return entry.frequency;
  }

  private async fetchSubmissions(passcode: string, showUnlockedToast: boolean): Promise<void> {
    this.loading.set(true);
    this.authError.set(null);
    try {
      const items = await firstValueFrom(this.adminService.loadEventSubmissions(passcode));
      this.entries.set(items);
      this.adminKey = passcode;
      this.unlocked.set(true);
      const message = showUnlockedToast ? 'Admin queue unlocked' : 'Queue refreshed';
      this.toast.success(message, 2400);
    } catch (error) {
      const err = error as HttpErrorResponse;
      if (!this.unlocked()) {
        this.authError.set(this.errorMessage(err));
        this.entries.set([]);
      } else {
        this.toast.error('Unable to refresh queue. Try again.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  private errorMessage(err?: HttpErrorResponse): string {
    if (!err) return 'Verification failed. Try again.';
    if (err.status === 401) return 'Admin key did not match. Try again.';
    if (err.status === 503) return 'Admin API is disabled on this build.';
    return 'Unable to reach the admin API. Try again.';
  }

  private capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
