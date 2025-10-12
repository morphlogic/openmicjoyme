import { Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { EventService } from '../../../core/services/event.service';
import { Event } from '../../../core/models/event.model';

interface DayGroup { date: Date; weekday: number; items: Event[] }
interface Vm { days: DayGroup[]; any: boolean }

@Component({
  selector: 'app-events-list',
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss']
})
export class EventsListComponent {
  weekdayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  vm$: Observable<Vm> = this.eventService.getThisWeek().pipe(
    map((days) => ({ days, any: days.some(d => d.items.length > 0) }))
  );
  constructor(private eventService: EventService) {}
}