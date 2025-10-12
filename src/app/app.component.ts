import { Component, OnInit, inject } from '@angular/core';
import { UpdateService } from './core/services/update.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentYear = new Date().getFullYear();
  private updateService = inject(UpdateService);
  ngOnInit(): void {
    this.updateService.init();
  }
}