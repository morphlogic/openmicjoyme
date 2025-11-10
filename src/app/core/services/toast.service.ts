import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  timeout?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<ToastMessage[]>([]);
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  success(message: string, timeout = 3200): number {
    return this.show(message, 'success', timeout);
  }

  error(message: string, timeout = 4200): number {
    return this.show(message, 'error', timeout);
  }

  dismiss(id: number): void {
    this.items.update(list => list.filter(toast => toast.id !== id));
  }

  private show(message: string, tone: ToastTone, timeout: number): number {
    const id = this.nextId++;
    const toast: ToastMessage = { id, message, tone, timeout };
    this.items.update(list => [...list, toast]);
    if (timeout > 0) {
      setTimeout(() => this.dismiss(id), timeout);
    }
    return id;
  }
}
