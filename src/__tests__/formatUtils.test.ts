import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/formatUtils';

describe('formatCurrency', () => {
  it('formats a whole number with two decimal places', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('formats a decimal value', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('uses thousands separator for large values', () => {
    expect(formatCurrency(10000)).toBe('$10,000.00');
  });
});

describe('formatDate', () => {
  it('returns N/A for null input', () => {
    expect(formatDate(null)).toBe('N/A');
  });

  it('returns N/A for empty string', () => {
    expect(formatDate('')).toBe('N/A');
  });

  it('formats a valid ISO date string', () => {
    // Result depends on timezone; just verify it is a non-empty string that is not N/A
    const result = formatDate('2026-06-15T12:00:00.000Z');
    expect(result).not.toBe('N/A');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes month and day in output', () => {
    const result = formatDate('2026-01-01T12:00:00.000Z');
    expect(result).toMatch(/Jan/);
  });
});

describe('getStatusColor', () => {
  it('returns green for completed', () => {
    expect(getStatusColor('completed')).toBe('#30D158');
  });

  it('returns orange for in_progress', () => {
    expect(getStatusColor('in_progress')).toBe('#FF9500');
  });

  it('returns grey for planned', () => {
    expect(getStatusColor('planned')).toBe('#8E8E93');
  });

  it('returns red for active', () => {
    expect(getStatusColor('active')).toBe('#FF453A');
  });

  it('returns green for cleared', () => {
    expect(getStatusColor('cleared')).toBe('#30D158');
  });

  it('returns grey for unknown status', () => {
    expect(getStatusColor('unknown_status')).toBe('#8E8E93');
  });
});

describe('getStatusLabel', () => {
  it('returns human-readable label for completed', () => {
    expect(getStatusLabel('completed')).toBe('Completed');
  });

  it('returns human-readable label for in_progress', () => {
    expect(getStatusLabel('in_progress')).toBe('In Progress');
  });

  it('returns human-readable label for planned', () => {
    expect(getStatusLabel('planned')).toBe('Planned');
  });

  it('returns human-readable label for active', () => {
    expect(getStatusLabel('active')).toBe('Active');
  });

  it('returns human-readable label for cleared', () => {
    expect(getStatusLabel('cleared')).toBe('Cleared');
  });

  it('returns the raw string for unknown status', () => {
    expect(getStatusLabel('some_custom_status')).toBe('some_custom_status');
  });
});
