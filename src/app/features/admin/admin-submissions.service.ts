import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface AdminContactInfo {
  name?: string;
  email?: string;
}

export interface AdminEventSubmission {
  id: string;
  submittedAt: string;
  role: string;
  eventRequestType: string;
  eventName?: string;
  eventDescription?: string;
  firstEventDateLocal?: string;
  firstEventDateIso?: string | null;
  frequency?: string;
  monthlyPattern?: string;
  monthlyOrdinal?: string;
  monthlyWeekday?: string;
  monthlyMonthday?: number | null;
  monthlyOtherText?: string;
  contact: AdminContactInfo;
  message?: string;
}

interface AdminEventResponse {
  ok: boolean;
  items: AdminEventSubmission[];
}

@Injectable({ providedIn: 'root' })
export class AdminSubmissionsService {
  private readonly http = inject(HttpClient);

  loadEventSubmissions(passcode: string): Observable<AdminEventSubmission[]> {
    const headers = new HttpHeaders({ 'x-omj-admin-key': passcode });
    return this.http
      .get<AdminEventResponse>('/api/admin/event-submissions', { headers })
      .pipe(map(res => res?.items ?? []));
  }
}
