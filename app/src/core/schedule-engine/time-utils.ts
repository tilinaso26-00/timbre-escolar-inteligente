import type { ScheduleEvent, TimeOnly } from './types';

export function timeToMinutes(time: TimeOnly): number {
  return time.hours * 60 + time.minutes;
}

export function minutesToTime(minutes: number): TimeOnly {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return { hours, minutes: mins };
}

export function formatTime(time: TimeOnly): string {
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
}

export function parseTime(timeStr: string): TimeOnly {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export function addMinutes(time: TimeOnly, minutes: number): TimeOnly {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function subtractMinutes(time: TimeOnly, minutes: number): TimeOnly {
  return minutesToTime(timeToMinutes(time) - minutes);
}

export function compareTime(a: TimeOnly, b: TimeOnly): number {
  return timeToMinutes(a) - timeToMinutes(b);
}

export function isTimeValid(time: TimeOnly): boolean {
  return time.hours >= 0 && time.hours <= 23 && time.minutes >= 0 && time.minutes <= 59;
}

export function calculateNextEventTime(
  currentTime: TimeOnly,
  events: ScheduleEvent[],
  journey: 'matutina' | 'vespertina'
): ScheduleEvent | null {
  const nowMinutes = timeToMinutes(currentTime);
  const today = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const upcoming = events
    .filter(e => e.journey === journey && e.activeDays.includes(today))
    .filter(e => timeToMinutes(e.bellTime) > nowMinutes)
    .sort((a, b) => timeToMinutes(a.bellTime) - timeToMinutes(b.bellTime));

  return upcoming[0] || null;
}

export function calculateTimeUntil(targetTime: TimeOnly, currentTime: TimeOnly): number {
  const target = timeToMinutes(targetTime);
  const current = timeToMinutes(currentTime);
  let diff = target - current;

  if (diff < 0) {
    diff += 24 * 60;
  }

  return diff;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function formatCountdown(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}