export interface TestCase {
  name: string;
  run: () => void | Promise<void>;
}

export function defineTest(name: string, run: () => void | Promise<void>): TestCase {
  return { name, run };
}

export function expect(condition: unknown, message = 'Expectation failed'): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function expectEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${formatValue(expected)} but received ${formatValue(actual)}`);
  }
}

export function expectDeepEqual(actual: unknown, expected: unknown, message?: string): void {
  const actualSerialized = JSON.stringify(actual);
  const expectedSerialized = JSON.stringify(expected);
  if (actualSerialized !== expectedSerialized) {
    throw new Error(message ?? `Expected ${expectedSerialized} but received ${actualSerialized}`);
  }
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean' || value === undefined) return `${value}`;
  return JSON.stringify(value);
}
