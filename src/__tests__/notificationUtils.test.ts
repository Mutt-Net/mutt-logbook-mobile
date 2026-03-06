import { getMileageDueReminders, DEFAULT_THRESHOLD_MILES } from '../lib/notificationUtils';
import { Reminder } from '../types';

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 1,
    vehicle_id: 1,
    type: 'Oil Change',
    interval_miles: null,
    interval_months: null,
    last_service_date: null,
    last_service_mileage: null,
    next_due_date: null,
    next_due_mileage: null,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getMileageDueReminders', () => {
  it('excludes reminders with null next_due_mileage', () => {
    const reminders = [makeReminder({ next_due_mileage: null })];
    expect(getMileageDueReminders(reminders, 10000)).toHaveLength(0);
  });

  it('includes overdue reminders (current mileage past due mileage)', () => {
    const reminder = makeReminder({ next_due_mileage: 9500 });
    const results = getMileageDueReminders([reminder], 10000);
    expect(results).toHaveLength(1);
    expect(results[0].isOverdue).toBe(true);
    expect(results[0].isDueSoon).toBe(false);
    expect(results[0].milesUntilDue).toBe(-500);
  });

  it('includes due_soon reminders within default threshold', () => {
    const reminder = makeReminder({ next_due_mileage: 10300 });
    const results = getMileageDueReminders([reminder], 10000);
    expect(results).toHaveLength(1);
    expect(results[0].isDueSoon).toBe(true);
    expect(results[0].isOverdue).toBe(false);
    expect(results[0].milesUntilDue).toBe(300);
  });

  it('excludes reminders outside the default threshold', () => {
    const reminder = makeReminder({ next_due_mileage: 11000 });
    const results = getMileageDueReminders([reminder], 10000);
    expect(results).toHaveLength(0);
  });

  it('respects a custom threshold', () => {
    const reminder = makeReminder({ next_due_mileage: 11000 });
    const results = getMileageDueReminders([reminder], 10000, 1500);
    expect(results).toHaveLength(1);
    expect(results[0].isDueSoon).toBe(true);
    expect(results[0].milesUntilDue).toBe(1000);
  });

  it('handles mixed reminders correctly', () => {
    const reminders = [
      makeReminder({ id: 1, next_due_mileage: null }),          // excluded: null
      makeReminder({ id: 2, next_due_mileage: 9800 }),          // overdue
      makeReminder({ id: 3, next_due_mileage: 10200 }),         // due soon
      makeReminder({ id: 4, next_due_mileage: 11000 }),         // outside threshold
    ];
    const results = getMileageDueReminders(reminders, 10000);
    expect(results).toHaveLength(2);
    expect(results.find(r => r.reminder.id === 2)?.isOverdue).toBe(true);
    expect(results.find(r => r.reminder.id === 3)?.isDueSoon).toBe(true);
  });

  it('uses DEFAULT_THRESHOLD_MILES = 500', () => {
    expect(DEFAULT_THRESHOLD_MILES).toBe(500);
  });
});
