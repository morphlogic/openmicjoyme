import { Component, signal, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, ValidatorFn } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContactService, ContactPayload } from './contact.service';
import { ToastService } from '../../core/services/toast.service';

type RoleValue = 'comedian' | 'showrunner' | 'venueOwner' | 'other';
type EventRequestValue = 'added' | 'removed' | 'updated' | 'none';
type FrequencyValue = 'weekly' | 'monthly' | 'one_time';
type MonthlyPatternValue = 'weekday' | 'date' | 'other';
type MonthOrdinal = 'first' | 'second' | 'third' | 'fourth' | 'last';
type WeekdayValue = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

interface ContactFormValues {
  name: string;
  email: string;
  message: string;
  role: RoleValue;
  eventRequestType: EventRequestValue;
  eventName: string;
  eventDescription: string;
  firstEventDate: string;
  frequency: FrequencyValue | '';
  monthlyPattern: MonthlyPatternValue;
  monthlyOrdinal: MonthOrdinal;
  monthlyWeekday: WeekdayValue;
  monthlyMonthday: number;
  monthlyOtherText: string;
  honey: string;
}

@Component({
  selector: 'omj-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <section class="wrap">
    <h1>Contact</h1>

    <form #contactFormEl [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <fieldset class="field" [class.invalid-field]="fieldInvalid('role')">
        <legend>I'm a... <span class="required" aria-hidden="true">*</span></legend>
        <div class="radio-grid" role="radiogroup" aria-label="Select who you are">
          <label class="radio" *ngFor="let option of roleOptions">
            <input
              type="radio"
              formControlName="role"
              [value]="option.value"
              [attr.aria-label]="option.label"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="field" *ngIf="showEventRequest" aria-live="polite">
        <legend>Event request</legend>
        <p class="hint">Let us know what kind of change you need.</p>
        <div class="radio-grid" role="radiogroup" aria-label="Event request type">
          <label class="radio" *ngFor="let option of eventRequestOptions">
            <input
              type="radio"
              formControlName="eventRequestType"
              [value]="option.value"
              [attr.aria-label]="option.label"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </fieldset>

      <section class="event-details" *ngIf="showEventDetails" aria-live="polite">
        <h2>Event details</h2>
        <p class="hint">These fields help us review your schedule change quickly.</p>

        <div class="field" [class.invalid-field]="fieldInvalid('eventName')">
          <label for="eventName">
            Event name
            <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('eventName')">*</span>
          </label>
          <input
            id="eventName"
            type="text"
            formControlName="eventName"
            [attr.aria-invalid]="fieldInvalid('eventName') ? 'true' : null"
            [attr.aria-describedby]="fieldInvalid('eventName') ? 'eventName-error' : null"
          />
          <p class="error" id="eventName-error" *ngIf="fieldInvalid('eventName')">{{ fieldMessage('eventName') }}</p>
        </div>

        <div class="field">
          <label for="eventDescription">Event description <span class="optional">(optional)</span></label>
          <textarea
            id="eventDescription"
            rows="3"
            formControlName="eventDescription"
          ></textarea>
        </div>

        <div class="field" [class.invalid-field]="fieldInvalid('firstEventDate')">
          <label for="firstEventDate">
            Next event date & time
            <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('firstEventDate')">*</span>
          </label>
          <input
            id="firstEventDate"
            type="datetime-local"
            formControlName="firstEventDate"
            [attr.min]="minEventDate"
            [attr.aria-invalid]="fieldInvalid('firstEventDate') ? 'true' : null"
            [attr.aria-describedby]="fieldInvalid('firstEventDate') ? 'firstEventDate-error' : 'firstEventDate-hint'"
          />
          <p class="hint" id="firstEventDate-hint">Please use your local time.</p>
          <p class="error" id="firstEventDate-error" *ngIf="fieldInvalid('firstEventDate')">{{ fieldMessage('firstEventDate') }}</p>
        </div>

        <fieldset class="field" [class.invalid-field]="fieldInvalid('frequency')">
          <legend>
            Frequency
            <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('frequency')">*</span>
          </legend>
          <div class="radio-grid" role="radiogroup" aria-label="Event frequency">
            <label class="radio" *ngFor="let option of frequencyOptions">
              <input
                type="radio"
                formControlName="frequency"
                [value]="option.value"
                [attr.aria-label]="option.label"
              />
              <span>{{ option.label }}</span>
            </label>
          </div>
          <p class="error" *ngIf="fieldInvalid('frequency')">{{ fieldMessage('frequency') }}</p>
        </fieldset>

        <section class="monthly-details" *ngIf="showMonthlyDetails">
          <p class="hint">Select how this monthly event repeats.</p>

          <fieldset class="field" [class.invalid-field]="fieldInvalid('monthlyPattern')">
            <legend>
              Monthly cadence
              <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('monthlyPattern')">*</span>
            </legend>
            <div class="radio-grid" role="radiogroup" aria-label="Monthly cadence options">
              <label class="radio" *ngFor="let option of monthlyPatternOptions">
                <input
                  type="radio"
                  formControlName="monthlyPattern"
                  [value]="option.value"
                  [attr.aria-label]="option.label"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p class="error" *ngIf="fieldInvalid('monthlyPattern')">{{ fieldMessage('monthlyPattern') }}</p>
          </fieldset>

          <div class="field monthly-control" *ngIf="monthlyPatternIs('weekday')" [class.invalid-field]="fieldInvalid('monthlyOrdinal')">
            <label>
              Week of month
              <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('monthlyOrdinal')">*</span>
            </label>
            <select
              formControlName="monthlyOrdinal"
              [attr.aria-invalid]="fieldInvalid('monthlyOrdinal') ? 'true' : null"
            >
              <option *ngFor="let option of ordinalOptions" [value]="option.value">{{ option.label }}</option>
            </select>
            <p class="error" *ngIf="fieldInvalid('monthlyOrdinal')">{{ fieldMessage('monthlyOrdinal') }}</p>
          </div>

          <div class="field monthly-control" *ngIf="monthlyPatternIs('weekday')" [class.invalid-field]="fieldInvalid('monthlyWeekday')">
            <label>
              Weekday
              <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('monthlyWeekday')">*</span>
            </label>
            <select
              formControlName="monthlyWeekday"
              [attr.aria-invalid]="fieldInvalid('monthlyWeekday') ? 'true' : null"
            >
              <option *ngFor="let option of weekdayOptions" [value]="option.value">{{ option.label }}</option>
            </select>
            <p class="error" *ngIf="fieldInvalid('monthlyWeekday')">{{ fieldMessage('monthlyWeekday') }}</p>
          </div>

          <div class="field monthly-control" *ngIf="monthlyPatternIs('date')" [class.invalid-field]="fieldInvalid('monthlyMonthday')">
            <label>
              Day of month
              <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('monthlyMonthday')">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="31"
              formControlName="monthlyMonthday"
              [attr.aria-invalid]="fieldInvalid('monthlyMonthday') ? 'true' : null"
            />
            <p class="error" *ngIf="fieldInvalid('monthlyMonthday')">{{ fieldMessage('monthlyMonthday') }}</p>
          </div>

          <div class="field" *ngIf="monthlyPatternIs('other')" [class.invalid-field]="fieldInvalid('monthlyOtherText')">
            <label>
              Describe the cadence
              <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('monthlyOtherText')">*</span>
            </label>
            <textarea
              rows="3"
              formControlName="monthlyOtherText"
              [attr.aria-invalid]="fieldInvalid('monthlyOtherText') ? 'true' : null"
            ></textarea>
            <p class="error" *ngIf="fieldInvalid('monthlyOtherText')">{{ fieldMessage('monthlyOtherText') }}</p>
          </div>
        </section>
      </section>

      <div class="field" [class.invalid-field]="fieldInvalid('name')">
        <label for="name">
          Name
          <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('name')">*</span>
        </label>
        <input
          id="name"
          formControlName="name"
          type="text"
          autocomplete="name"
          required
          [attr.aria-invalid]="fieldInvalid('name') ? 'true' : null"
          [attr.aria-describedby]="fieldInvalid('name') ? 'name-error' : null"
        />
        <p class="error" id="name-error" *ngIf="fieldInvalid('name')">{{ fieldMessage('name') }}</p>
      </div>

      <div class="field" [class.invalid-field]="fieldInvalid('email')">
        <label for="email">
          Email
          <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('email')">*</span>
        </label>
        <input
          id="email"
          formControlName="email"
          type="email"
          autocomplete="email"
          required
          [attr.aria-invalid]="fieldInvalid('email') ? 'true' : null"
          [attr.aria-describedby]="fieldInvalid('email') ? 'email-error' : null"
        />
        <p class="error" id="email-error" *ngIf="fieldInvalid('email')">{{ fieldMessage('email') }}</p>
      </div>

      <div class="field" [class.invalid-field]="fieldInvalid('message')">
        <label for="message">
          Additional details
          <ng-container *ngIf="additionalDetailsRequired; else optionalDetails">
            <span class="required" aria-hidden="true" [class.invalid]="fieldInvalid('message')">*</span>
          </ng-container>
          <ng-template #optionalDetails>
            <span class="optional">(optional)</span>
          </ng-template>
        </label>
        <textarea
          id="message"
          formControlName="message"
          rows="6"
          [attr.required]="additionalDetailsRequired ? '' : null"
          [attr.aria-required]="additionalDetailsRequired ? 'true' : null"
          [attr.aria-invalid]="fieldInvalid('message') ? 'true' : null"
          [attr.aria-describedby]="fieldInvalid('message') ? 'message-error' : null"
        ></textarea>
        <p class="error" id="message-error" *ngIf="fieldInvalid('message')">{{ fieldMessage('message') }}</p>
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
    h2 { margin: 1.4rem 0 .5rem; font-size: 1.25rem; }
    fieldset { border: 1px solid rgba(255,255,255,.1); border-radius: .8rem; padding: .9rem 1rem 1.1rem; margin-bottom: 1rem; }
    legend { padding: 0 .5rem; font-weight: 600; color: #ddd; }
    .event-details > .field { margin-top: 1rem; }
    .field { display: grid; gap: .4rem; margin-bottom: .9rem; }
    input, textarea {
      width: 100%; padding: .7rem .8rem; border-radius: .6rem; border: 1px solid #333;
      background: #111; color: #eee; outline: none;
    }
    input:focus, textarea:focus, select:focus { border-color: var(--color-accent, #ff6f61); box-shadow: 0 0 0 2px rgba(255,111,97,.2); }
    select {
      width: 100%; padding: .65rem .7rem; border-radius: .6rem; border: 1px solid #333;
      background: #111; color: #eee;
    }
    .monthly-control { grid-template-columns: 1fr; }
    label { font-weight: 600; color: #ccc; }
    .required { margin-left: .25rem; color: rgba(255,255,255,.5); font-size: .95em; }
    .required.invalid { color: #ff8a80; }
    .optional { font-weight: 400; color: #888; font-size: .9em; }
    .hint { font-size: .85rem; color: #9aa0a6; margin: 0 0 .2rem; }
    .radio-grid { display: grid; gap: .5rem; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-top: .6rem; }
    .radio { display: flex; align-items: center; gap: .4rem; padding: .45rem .6rem; border: 1px solid #333; border-radius: .6rem; background: #0b0b0b; }
    .radio input { width: auto; }
    button {
      padding: .75rem 1.1rem; border: none; border-radius: .7rem; cursor: pointer;
      background: var(--color-accent, #ff6f61); color: #111; font-weight: 700;
      box-shadow: var(--shadow-soft, 0 14px 42px rgba(0,0,0,.55));
      margin-top: .6rem;
    }
    .error { color: #ff8a80; font-size: .82rem; margin: -.2rem 0 0; }
    .error::before { content: '• '; }
    .monthly-details { border-left: 2px solid rgba(255,255,255,.08); padding-left: 1rem; margin: 1rem 0; }
    .honey { position: absolute; left: -99999px; width: 1px; height: 1px; opacity: 0; }
    .invalid-field input,
    .invalid-field textarea,
    .invalid-field select {
      background: rgba(255,138,128,.25);
      border-color: #ff8a80;
    }
    fieldset.invalid-field {
      border-color: #ff8a80;
      background: rgba(255,138,128,.12);
    }
    fieldset.invalid-field legend { color: #ffb4a9; }
    .error-pulse {
      animation: errorPulse .7s ease;
    }
    @keyframes errorPulse {
      0% { box-shadow: 0 0 0 0 rgba(255,138,128,.4); }
      100% { box-shadow: 0 0 0 20px rgba(255,138,128,0); }
    }
    @media (max-width: 600px) {
      fieldset { padding: .8rem; }
      .radio-grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
    }
  `]
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContactService);
  private readonly toast = inject(ToastService);
  @ViewChild('contactFormEl', { read: ElementRef }) private formElement?: ElementRef<HTMLFormElement>;

  readonly roleOptions = [
    { value: 'other', label: 'Comedy Fan' },
    { value: 'comedian', label: 'Comedian' },
    { value: 'showrunner', label: 'Host / MC' },
    { value: 'venueOwner', label: 'Venue / Show Rep' }
  ] as const;

  readonly eventRequestOptions = [
    { value: 'added', label: 'Added' },
    { value: 'removed', label: 'Removed' },
    { value: 'updated', label: 'Updated' },
    { value: 'none', label: 'None of the above' }
  ] as const;

  readonly frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'one_time', label: 'One time' }
  ] as const;

  readonly monthlyPatternOptions = [
    { value: 'weekday', label: 'Certain weekday of the month' },
    { value: 'date', label: 'Specific date each month' },
    { value: 'other', label: 'Other' }
  ] as const;

  readonly ordinalOptions = [
    { value: 'first', label: 'First' },
    { value: 'second', label: 'Second' },
    { value: 'third', label: 'Third' },
    { value: 'fourth', label: 'Fourth' },
    { value: 'last', label: 'Last' }
  ] as const;

  readonly weekdayOptions = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ] as const;

  private readonly eventRoles = new Set<RoleValue>(['comedian', 'showrunner', 'venueOwner']);
  private readonly actionableRequests = new Set<EventRequestValue>(['added', 'removed', 'updated']);

  private readonly defaultValues: ContactFormValues = {
    name: '',
    email: '',
    message: '',
    role: 'other',
    eventRequestType: 'none',
    eventName: '',
    eventDescription: '',
    firstEventDate: '',
    frequency: '',
    monthlyPattern: 'weekday',
    monthlyOrdinal: 'first',
    monthlyWeekday: 'monday',
    monthlyMonthday: 1,
    monthlyOtherText: '',
    honey: ''
  };

  readonly form = this.fb.nonNullable.group({
    name: [this.defaultValues.name, [Validators.required]],
    email: [this.defaultValues.email, [Validators.required, Validators.email]],
    message: [this.defaultValues.message, [Validators.required, Validators.minLength(5)]],
    role: [this.defaultValues.role, [Validators.required]],
    eventRequestType: [this.defaultValues.eventRequestType, [Validators.required]],
    eventName: [this.defaultValues.eventName],
    eventDescription: [this.defaultValues.eventDescription],
    firstEventDate: [this.defaultValues.firstEventDate],
    frequency: [this.defaultValues.frequency],
    monthlyPattern: [this.defaultValues.monthlyPattern],
    monthlyOrdinal: [this.defaultValues.monthlyOrdinal],
    monthlyWeekday: [this.defaultValues.monthlyWeekday],
    monthlyMonthday: [this.defaultValues.monthlyMonthday, [Validators.min(1), Validators.max(31)]],
    monthlyOtherText: [this.defaultValues.monthlyOtherText],
    honey: [this.defaultValues.honey]
  });

  busy = signal(false);

  constructor() {
    this.setupConditionalValidation();
  }

  get showEventRequest(): boolean {
    return this.eventRoles.has(this.form.controls.role.value as RoleValue);
  }

  get showEventDetails(): boolean {
    return this.requiresEventDetails();
  }

  get showMonthlyDetails(): boolean {
    return this.showEventDetails && this.form.controls.frequency.value === 'monthly';
  }

  get additionalDetailsRequired(): boolean {
    return !this.requiresEventDetails();
  }

  get minEventDate(): string {
    return this.formatDateForInput(new Date());
  }

  monthlyPatternIs(value: MonthlyPatternValue): boolean {
    return this.form.controls.monthlyPattern.value === value;
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.scrollToFirstError();
      return;
    }
    this.busy.set(true);
    try {
      const raw = this.form.getRawValue();
      const needsEvent = this.requiresEventDetails();
      const payload: ContactPayload = {
        name: raw.name.trim(),
        email: raw.email.trim(),
        message: raw.message.trim(),
        role: raw.role,
        eventRequestType: raw.eventRequestType,
        honey: raw.honey || undefined
      };

      if (needsEvent) {
        payload.eventName = raw.eventName?.trim() ?? '';
        payload.eventDescription = raw.eventDescription?.trim() ?? '';
        payload.firstEventDate = raw.firstEventDate;
        payload.frequency = raw.frequency || undefined;

        if (payload.frequency === 'monthly') {
          payload.monthlyPattern = raw.monthlyPattern;
          if (raw.monthlyPattern === 'weekday') {
            payload.monthlyOrdinal = raw.monthlyOrdinal;
            payload.monthlyWeekday = raw.monthlyWeekday;
          } else if (raw.monthlyPattern === 'date') {
            payload.monthlyMonthday = raw.monthlyMonthday;
          } else if (raw.monthlyPattern === 'other') {
            payload.monthlyOtherText = raw.monthlyOtherText?.trim() ?? '';
          }
        } else if (payload.frequency === 'weekly' || payload.frequency === 'one_time') {
          // nothing extra to capture
        }
      }

      if (!needsEvent && raw.eventDescription?.trim()) {
        payload.eventDescription = raw.eventDescription.trim();
      }
      await this.api.submit(payload);
      this.toast.success('Thanks — we received your message.');
      this.form.reset(this.defaultValues);
      this.updateEventValidators();
    } catch {
      this.toast.error('Sorry, something went wrong. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  fieldInvalid(controlName: keyof ContactFormValues): boolean {
    const ctrl = this.form.get(controlName as string);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  fieldMessage(controlName: keyof ContactFormValues): string {
    const ctrl = this.form.get(controlName as string);
    const errors = ctrl?.errors;
    if (!errors) return '';
    if (errors['required']) {
      switch (controlName) {
        case 'name':
          return 'Name is required.';
        case 'email':
          return 'Email is required.';
        case 'message':
          return 'Additional details are required unless you included event info.';
        case 'eventName':
          return 'Event name is required for schedule updates.';
        case 'firstEventDate':
          return 'Please provide the first event date and time.';
        case 'frequency':
          return 'Select how often this event occurs.';
        case 'monthlyPattern':
          return 'Choose how the monthly cadence repeats.';
        case 'monthlyOrdinal':
          return 'Select which week of the month this occurs.';
        case 'monthlyWeekday':
          return 'Select a weekday.';
        case 'monthlyMonthday':
          return 'Provide the day of the month.';
        case 'monthlyOtherText':
          return 'Describe the monthly cadence.';
        default:
          return 'Please check this field.';
      }
    }
    if (errors['email']) return 'Please enter a valid email address.';
    if (errors['pastDate']) return 'Event date must be in the future.';
    if (errors['invalidDate']) return 'Please enter a valid date and time.';
    if (errors['minlength']) {
      if (controlName === 'message') return 'Additional details must be at least 5 characters.';
      if (controlName === 'monthlyOtherText') return 'Description must be at least 5 characters.';
    }
    if (errors['min'] || errors['max']) return 'Day must be between 1 and 31.';
    return 'Please check this field.';
  }

  private requiresEventDetails(): boolean {
    return (
      this.eventRoles.has(this.form.controls.role.value as RoleValue) &&
      this.actionableRequests.has(this.form.controls.eventRequestType.value as EventRequestValue)
    );
  }

  private setupConditionalValidation(): void {
    const controls = this.form.controls;
    controls.role.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateEventValidators());
    controls.eventRequestType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateEventValidators());
    controls.frequency.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateEventValidators());
    controls.monthlyPattern.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateEventValidators());
    this.updateEventValidators();
  }

  private updateEventValidators(): void {
    const needsEvent = this.requiresEventDetails();
    this.setControlValidators('eventName', needsEvent ? [Validators.required] : []);
    const futureDateValidator = this.futureDateValidator();
    this.setControlValidators('firstEventDate', needsEvent ? [Validators.required, futureDateValidator] : []);
    this.setControlValidators('frequency', needsEvent ? [Validators.required] : []);

    const needsMonthly = needsEvent && this.form.controls.frequency.value === 'monthly';
    this.setControlValidators('monthlyPattern', needsMonthly ? [Validators.required] : []);

    const pattern = this.form.controls.monthlyPattern.value;
    this.setControlValidators('monthlyOrdinal', needsMonthly && pattern === 'weekday' ? [Validators.required] : []);
    this.setControlValidators('monthlyWeekday', needsMonthly && pattern === 'weekday' ? [Validators.required] : []);

    const dayValidators: ValidatorFn[] = needsMonthly && pattern === 'date'
      ? [Validators.required, Validators.min(1), Validators.max(31)]
      : [Validators.min(1), Validators.max(31)];
    this.setControlValidators('monthlyMonthday', dayValidators);

    const otherValidators: ValidatorFn[] = needsMonthly && pattern === 'other'
      ? [Validators.required, Validators.minLength(5)]
      : [];
    this.setControlValidators('monthlyOtherText', otherValidators);

    const messageValidators: ValidatorFn[] = this.additionalDetailsRequired
      ? [Validators.required, Validators.minLength(5)]
      : [this.minLengthIfProvided(5)];
    this.setControlValidators('message', messageValidators);
  }

  private setControlValidators(controlName: keyof ContactFormValues, validators: ValidatorFn[]): void {
    const ctrl = this.form.get(controlName as string);
    if (!ctrl) return;
    ctrl.setValidators(validators.length ? validators : null);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private formatDateForInput(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private scrollToFirstError(): void {
    queueMicrotask(() => {
      const host = this.formElement?.nativeElement;
      if (!host) return;
      const firstInvalid = host.querySelector('.invalid-field');
      if (!(firstInvalid instanceof HTMLElement)) return;
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusTarget = firstInvalid.querySelector<HTMLElement>('input, textarea, select');
      focusTarget?.focus();
      firstInvalid.classList.add('error-pulse');
      setTimeout(() => firstInvalid.classList.remove('error-pulse'), 600);
    });
  }

  private futureDateValidator(): ValidatorFn {
    return control => {
      const value = control.value;
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return { invalidDate: true };
      return date.getTime() < Date.now() ? { pastDate: true } : null;
    };
  }

  private minLengthIfProvided(length: number): ValidatorFn {
    return control => {
      const value = (control.value ?? '').toString().trim();
      if (!value) return null;
      return value.length >= length ? null : { minlength: { requiredLength: length, actualLength: value.length } };
    };
  }
}
