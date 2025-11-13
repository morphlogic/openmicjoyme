import { Component } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { EventService, DayGroup } from '../../../core/services/event.service';

interface Vm { days: DayGroup[]; any: boolean; rangeStart: Date; rangeEnd: Date }

@Component({
  selector: 'app-events-list',
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss']
})
export class EventsListComponent {
  private readonly maxOffset = 7;
  private currentOffset = 0;
  private readonly offset$ = new BehaviorSubject(0);

  weekdayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  vm$: Observable<Vm> = this.offset$.pipe(
    switchMap((offset) => this.eventService.getWeek(offset)),
    map((week) => ({
      days: week.days,
      rangeStart: week.rangeStart,
      rangeEnd: week.rangeEnd,
      any: week.days.some(d => d.items.length > 0)
    }))
  );
  constructor(private eventService: EventService) {}

  shiftWeek(direction: number): void {
    const next = this.currentOffset + direction;
    const clamped = Math.max(0, Math.min(this.maxOffset, next));
    if (clamped === this.currentOffset) return;
    this.currentOffset = clamped;
    this.offset$.next(this.currentOffset);
  }

  get disablePrev(): boolean {
    return this.currentOffset === 0;
  }

  get disableNext(): boolean {
    return this.currentOffset >= this.maxOffset;
  }
}
