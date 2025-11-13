import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { Event } from '../models/event.model';
import { startOfWeek, addDays } from 'date-fns';

export interface DayGroup { date: Date; weekday: number; items: Event[] }
export interface WeekSchedule { days: DayGroup[]; rangeStart: Date; rangeEnd: Date }

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly url = '/api/events';

  constructor(private http: HttpClient) {}

  getWeek(offset = 0): Observable<WeekSchedule> {
    const rangeStart = this.buildWeekStart(offset);
    const params = new HttpParams().set('start', rangeStart.toISOString());

    return this.http.get<{ ok: boolean; items?: Event[] }>(this.url, { params }).pipe(
      map((response) => (response?.ok && Array.isArray(response.items) ? response.items : [])),
      map((events) => this.mapEventsToWeek(events, rangeStart)),
      catchError(() => of(this.buildEmptyWeek(rangeStart)))
    );
  }

  private mapEventsToWeek(events: Event[], rangeStart: Date): WeekSchedule {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(rangeStart, i);
      const dayKey = this.toDateKey(date);
      return {
        date,
        weekday: i,
        items: events.filter((event) => event.eventDate === dayKey),
      };
    });
    return { days, rangeStart, rangeEnd: addDays(rangeStart, 6) };
  }

  private buildEmptyWeek(rangeStart: Date): WeekSchedule {
    const days = Array.from({ length: 7 }, (_, i) => ({
      date: addDays(rangeStart, i),
      weekday: i,
      items: [],
    }));
    return { days, rangeStart, rangeEnd: addDays(rangeStart, 6) };
  }

  private buildWeekStart(offset: number): Date {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    return addDays(weekStart, offset * 7);
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
