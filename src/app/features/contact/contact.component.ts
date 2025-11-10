import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ContactService } from './contact.service';

@Component({
  selector: 'omj-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <section class="wrap">
    <h1>Contact</h1>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label>Name</label>
        <input formControlName="name" type="text" autocomplete="name" />
      </div>

      <div class="field">
        <label>Email</label>
        <input formControlName="email" type="email" autocomplete="email" />
      </div>

      <div class="field">
        <label>Message</label>
        <textarea formControlName="message" rows="6"></textarea>
      </div>

      <!-- honey pot -->
      <input formControlName="honey" type="text" tabindex="-1" autocomplete="off" class="honey">

      <button type="submit" [disabled]="form.invalid || busy()">Send</button>
    </form>

    <p class="ok" *ngIf="ok()">Thanks — we received your message.</p>
    <p class="err" *ngIf="err()">Sorry, something went wrong. Please try again.</p>
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
    .ok { color: #6dd96d; margin-top: .7rem; }
    .err { color: #ff8a80; margin-top: .7rem; }
    .honey { position: absolute; left: -99999px; width: 1px; height: 1px; opacity: 0; }
  `]
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContactService);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.email]],
    message: ['', [Validators.required, Validators.minLength(5)]],
    honey: ['']
  });

  busy = signal(false);
  ok = signal(false);
  err = signal(false);

  async submit() {
    this.ok.set(false); this.err.set(false);
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      await this.api.submit(this.form.getRawValue());
      this.ok.set(true);
      this.form.patchValue({ message: '' });
    } catch {
      this.err.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
