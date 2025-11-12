import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  honey?: string; // hidden anti-bot
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly base = '';
  private readonly endpoint = '/api/contact';

  constructor(private readonly http: HttpClient) {}

  async submit(payload: ContactPayload): Promise<{ ok: boolean }> {
    const body: ContactPayload = {
      ...payload,
      honey: payload.honey?.trim() ?? ''
    };

    if (body.honey) {
      return { ok: true };
    }
    body.honey = '';

    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean }>(`${this.base}${this.endpoint}`, body, { withCredentials: false })
      );
      return res;
    } catch (e) {
      const er = e as HttpErrorResponse;
      console.error('contact submit failed', er.status, er.message);
      throw e;
    }
  }
}
