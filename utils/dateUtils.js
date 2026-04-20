import { isWorkingDay, countWorkingDays } from '../services/holidayService.js';

export { isWorkingDay, countWorkingDays };

export function getWorkingDaysInRange(start, end) {
  return countWorkingDays(start, end);
}

export function formatDate(date) {
  return date.toISOString().split('T')[0];
}