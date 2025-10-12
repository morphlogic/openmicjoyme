import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { Event } from '../models/event.model';
import { startOfWeek, addDays } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly url = 'assets/data/events.json';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Event[]> {
    return this.http.get<Event[]>(this.url).pipe(
      catchError(() => of([]))
    );
  }

  getThisWeek(): Observable<{ date: Date; weekday: number; items: Event[] }[]> {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });

    return this.getAll().pipe(
      map((events) => {
        const days = Array.from({ length: 7 }, (_, i) => ({
          date: addDays(weekStart, i),
          weekday: i,
          items: events.filter((e) => e.dayOfWeek === i),
        }));
        return days;
      })
    );
  }
}
