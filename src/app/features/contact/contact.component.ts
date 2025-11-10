import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ContactService } from './contact.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'omj-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <section class="wrap">
    <h1>Contact</h1>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="name">Name</label>
        <input
          id="name"
          formControlName="name"
          type="text"
          autocomplete="name"
          required
          [attr.aria-invalid]="fieldInvalid('name') ? 'true' : null"
        />
        <p class="error" *ngIf="fieldInvalid('name')">{{ fieldMessage('name') }}</p>
      </div>

      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          formControlName="email"
          type="email"
          autocomplete="email"
          required
          [attr.aria-invalid]="fieldInvalid('email') ? 'true' : null"
        />
        <p class="error" *ngIf="fieldInvalid('email')">{{ fieldMessage('email') }}</p>
      </div>

      <div class="field">
        <label for="message">Message</label>
        <textarea
          id="message"
          formControlName="message"
          rows="6"
          required
          minlength="5"
          [attr.aria-invalid]="fieldInvalid('message') ? 'true' : null"
        ></textarea>
        <p class="error" *ngIf="fieldInvalid('message')">{{ fieldMessage('message') }}</p>
      </div>

      <!-- honey pot -->
      <input formControlName="honey" type="text" tabindex="-1" autocomplete="off" class="honey">

      <button type="submit" [disabled]="form.invalid || busy()">Send</button>
    </form>
  </section>
  `,
  styles: [`
    .wrap { max-width: 720px; margin: 2rem auto; padding: 1rem; }
    h1 { margin-bottom: 1rem; }
    .field { display: grid; gap: .4rem; margin-bottom: .9rem; }
    input, textarea {
      width: 100%; padding: .7rem .8rem; border-radius: .6rem; border: 1px solid #333;
      background: #111; color: #eee; outline: none;
    }
    label { font-weight: 600; color: #ccc; }
    button {
      padding: .75rem 1.1rem; border: none; border-radius: .7rem; cursor: pointer;
      background: var(--color-accent, #ff6f61); color: #111; font-weight: 700;
      box-shadow: var(--shadow-soft, 0 14px 42px rgba(0,0,0,.55));
    }
    .error { color: #ff8a80; font-size: .82rem; margin: -.2rem 0 0; }
    .error::before { content: '• '; }
    .honey { position: absolute; left: -99999px; width: 1px; height: 1px; opacity: 0; }
  `]
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContactService);
  private readonly toast = inject(ToastService);

  private readonly defaultValues = {
    name: '',
    email: '',
    message: '',
    honey: ''
  };

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(5)]],
    honey: ['']
  });

  busy = signal(false);

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      await this.api.submit(this.form.getRawValue());
      this.toast.success('Thanks — we received your message.');
      this.form.reset(this.defaultValues);
    } catch {
      this.toast.error('Sorry, something went wrong. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  fieldInvalid(control: 'name' | 'email' | 'message'): boolean {
    const ctrl = this.form.controls[control];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  fieldMessage(control: 'name' | 'email' | 'message'): string {
    const ctrl = this.form.controls[control];
    const errors = ctrl.errors;
    if (!errors) return '';
    if (errors['required']) {
      if (control === 'name') return 'Name is required.';
      if (control === 'email') return 'Email is required.';
      return 'Message is required.';
    }
    if (errors['email']) return 'Please enter a valid email address.';
    if (errors['minlength']) return 'Message must be at least 5 characters.';
    return 'Please check this field.';
  }
}
