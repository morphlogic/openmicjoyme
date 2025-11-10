import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'omj-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-host" *ngIf="toasts().length" aria-live="polite">
      <article
        class="toast"
        *ngFor="let toast of toasts(); trackBy: trackById"
        [attr.role]="toast.tone === 'error' ? 'alert' : 'status'"
        [ngClass]="toast.tone"
      >
        <span>{{ toast.message }}</span>
        <button type="button" (click)="dismiss(toast.id)" aria-label="Dismiss notification">&times;</button>
      </article>
    </div>
  `,
  styles: [`
    .toast-host {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      display: grid;
      gap: 0.75rem;
      z-index: 1200;
      pointer-events: none;
    }
    .toast {
      color: #f3f3f3;
      background: rgba(24, 24, 28, 0.95);
      border-radius: 0.75rem;
      padding: 0.8rem 1rem;
      display: flex;
      gap: 0.75rem;
      align-items: center;
      min-width: 240px;
      max-width: min(420px, 90vw);
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.35);
      pointer-events: auto;
    }
    .toast.success {
      border-left: 4px solid #6dd96d;
    }
    .toast.error {
      border-left: 4px solid #ff8a80;
    }
    button {
      margin-left: auto;
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.1rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.1rem 0.2rem;
    }
    button:hover {
      opacity: 0.8;
    }
    @media (max-width: 600px) {
      .toast-host {
        top: auto;
        bottom: 1.2rem;
        right: 1rem;
        left: 1rem;
        justify-items: end;
      }
      .toast {
        width: 100%;
      }
    }
  `]
})
export class ToastContainerComponent {
  private readonly service = inject(ToastService);
  readonly toasts = this.service.toasts;

  trackById(_: number, toast: { id: number }): number {
    return toast.id;
  }

  dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
