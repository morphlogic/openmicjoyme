import { defineTest, expectDeepEqual, expectEqual } from '../../src/testing/test-helpers';

declare function require(name: string): any;
declare const process: any;

const path = require('path');
const { buildHealthPayload } = require(path.join(process.cwd(), 'server/health'));

export const tests = [
  defineTest('buildHealthPayload returns ok when all checks pass', () => {
    const now = new Date('2024-08-01T12:00:00.000Z');
    const payload = buildHealthPayload({
      version: '1.2.3',
      checks: { dist: true, contactRoute: true },
      now
    });
    expectEqual(payload.status, 'ok');
    expectEqual(payload.version, '1.2.3');
    expectEqual(payload.time, now.toISOString());
    expectDeepEqual(payload.checks, { dist: true, contactRoute: true });
  }),
  defineTest('buildHealthPayload reports degraded status when a check fails', () => {
    const now = new Date('2024-08-02T09:30:00.000Z');
    const payload = buildHealthPayload({
      version: '1.2.3',
      checks: { dist: false, contactRoute: true },
      now
    });
    expectEqual(payload.status, 'degraded');
    expectDeepEqual(payload.checks, { dist: false, contactRoute: true });
  })
];
