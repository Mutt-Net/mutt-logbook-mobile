import { Reminder } from '../types';

export const DEFAULT_THRESHOLD_MILES = 500;

export interface MileageDueResult {
  reminder: Reminder;
  milesUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
}

/**
 * Returns reminders that are overdue or within thresholdMiles of next_due_mileage.
 * Reminders with null next_due_mileage are ignored.
 */
export function getMileageDueReminders(
  reminders: Reminder[],
  currentMileage: number,
  thresholdMiles: number = DEFAULT_THRESHOLD_MILES,
): MileageDueResult[] {
  return reminders
    .filter(r => r.next_due_mileage !== null)
    .map(r => {
      const milesUntilDue = (r.next_due_mileage as number) - currentMileage;
      const isOverdue = milesUntilDue <= 0;
      const isDueSoon = !isOverdue && milesUntilDue <= thresholdMiles;
      return { reminder: r, milesUntilDue, isOverdue, isDueSoon };
    })
    .filter(result => result.isOverdue || result.isDueSoon);
}
