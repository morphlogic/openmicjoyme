import { Observable } from 'rxjs';
import { ContactService, ContactPayload } from './contact.service';
import { defineTest, expect, expectDeepEqual, expectEqual } from '../../../testing/test-helpers';

interface RecordedRequest<T> {
  url: string;
  body: unknown;
  options: unknown;
  respond: (value: T) => void;
  reject: (error: unknown) => void;
}

class HttpClientStub {
  readonly requests: RecordedRequest<unknown>[] = [];

  post<T>(url: string, body: unknown, options?: unknown): Observable<T> {
    return new Observable<T>((subscriber) => {
      const record: RecordedRequest<T> = {
        url,
        body,
        options: options ?? {},
        respond: (value: T) => {
          subscriber.next(value);
          subscriber.complete();
        },
        reject: (error: unknown) => subscriber.error(error)
      };
      this.requests.push(record as RecordedRequest<unknown>);
      return () => void 0;
    });
  }
}

function createPayload(overrides: Partial<ContactPayload> = {}): ContactPayload {
  return {
    name: 'Test User',
    email: 'test@example.com',
    message: 'Just saying hi.',
    honey: '',
    ...overrides
  };
}

function setup() {
  const http = new HttpClientStub();
  const service = new ContactService(http as unknown as any);
  return { service, http };
}

export const tests = [
  defineTest('submits payload to the contact API when honey is empty', async () => {
    const { service, http } = setup();
    const payload = createPayload();

    const submitPromise = service.submit(payload);
    expectEqual(http.requests.length, 1, 'contact service should enqueue one HTTP request');
    const req = http.requests[0];
    expectEqual(req.url, '/api/contact');
    expectDeepEqual(req.body, payload);

    req.respond({ ok: true });
    const response = await submitPromise;
    expect(response.ok, 'Contact API should resolve to ok');
  }),
  defineTest('honey trap short-circuits without issuing a network request', async () => {
    const { service, http } = setup();
    const payload = createPayload({ honey: 'bot payload' });

    const response = await service.submit(payload);
    expect(response.ok, 'Honey trap submissions still resolve ok');
    expectEqual(http.requests.length, 0, 'No HTTP calls should be made when honey field is populated');
  })
];
