import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  role: 'comedian' | 'showrunner' | 'venueOwner' | 'other';
  eventRequestType: 'added' | 'removed' | 'updated' | 'none';
  eventName?: string;
  eventDescription?: string;
  firstEventDate?: string;
  frequency?: 'weekly' | 'monthly' | 'one_time';
  monthlyPattern?: 'weekday' | 'date' | 'other';
  monthlyOrdinal?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  monthlyWeekday?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  monthlyMonthday?: number;
  monthlyOtherText?: string;
  honey?: string; // hidden anti-bot
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly base = '';

  async submit(payload: ContactPayload): Promise<{ ok: boolean }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean }>(`${this.base}/api/contact`, payload, { withCredentials: false })
      );
      return res;
    } catch (e) {
      const er = e as HttpErrorResponse;
      console.error('contact submit failed', er.status, er.message);
      throw e;
    }
  }
}
