import * as Notifications from 'expo-notifications';
import { VehicleService, ReminderService } from './database';
import { getMileageDueReminders } from '../lib/notificationUtils';

const LOOK_AHEAD_DAYS = 14;

/**
 * Request notification permissions. Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancel all pending notifications, then reschedule based on current reminders.
 * Checks all vehicles' reminders and schedules for those due within LOOK_AHEAD_DAYS.
 * Overdue reminders fire immediately (5s delay to allow app to fully load).
 */
export async function scheduleReminderNotifications(): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const vehicles = await VehicleService.getAll();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const vehicle of vehicles) {
    const reminders = await ReminderService.getByVehicle(vehicle.id);

    for (const reminder of reminders) {
      if (!reminder.next_due_date) continue;

      const dueDate = new Date(reminder.next_due_date);
      dueDate.setHours(9, 0, 0, 0);

      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / msPerDay);

      if (daysUntilDue > LOOK_AHEAD_DAYS) continue;

      let title: string;
      let body: string;
      let triggerDate: Date;

      if (daysUntilDue <= 0) {
        const overdueDays = Math.abs(daysUntilDue);
        title = `Overdue: ${reminder.type}`;
        body = overdueDays === 0
          ? `${vehicle.name} service due today: ${reminder.type}`
          : `${vehicle.name} is ${overdueDays} day(s) overdue for ${reminder.type}`;
        triggerDate = new Date(Date.now() + 5000);
      } else if (daysUntilDue === 1) {
        title = `Service Due Tomorrow: ${reminder.type}`;
        body = `${vehicle.name} needs ${reminder.type} tomorrow`;
        triggerDate = dueDate;
      } else {
        title = `Upcoming Service: ${reminder.type}`;
        body = `${vehicle.name} is due for ${reminder.type} in ${daysUntilDue} days`;
        triggerDate = dueDate;
      }

      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
    }

    const mileageDue = getMileageDueReminders(reminders, vehicle.mileage);
    for (const { reminder, milesUntilDue, isOverdue } of mileageDue) {
      const title = isOverdue
        ? `Overdue: ${reminder.type}`
        : `Upcoming: ${reminder.type}`;
      const body = isOverdue
        ? `${vehicle.name} is ${Math.abs(milesUntilDue).toLocaleString()} mi overdue for ${reminder.type}`
        : `${vehicle.name} needs ${reminder.type} in ${milesUntilDue.toLocaleString()} mi`;
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 5000) },
      });
    }
  }
}
