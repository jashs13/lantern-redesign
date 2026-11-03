import { describe, expect, it } from 'vitest';

import { formatDuration } from './formatters';

describe('formatDuration', () => {
  it('hides missing and negative response-time sentinels', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
  });

  it('formats valid response times', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(0.069)).toBe('69ms');
    expect(formatDuration(1.5)).toBe('1.5s');
    expect(formatDuration(61)).toBe('1m 1s');
  });
});
