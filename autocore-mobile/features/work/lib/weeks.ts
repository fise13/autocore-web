/**
 * Week boundaries for the Work tab.
 *
 * Extracted so the Today trend and the per-workspace sparks bucket time the
 * same way. Two charts on one screen disagreeing about where a week starts is
 * the kind of thing nobody notices until a Monday number lands in the wrong
 * bar.
 *
 * Weeks are local and start on Sunday, matching the existing Today trend.
 */

export type WeekWindow = {
  start: Date;
  /** Inclusive — one millisecond before the next week begins. */
  end: Date;
};

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

export function endOfWeek(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(-1);
  return end;
}

/**
 * The last `count` weeks, oldest → newest.
 *
 * The final window is the current week, still in progress — its bar is
 * therefore always a partial count, which is what makes the newest bar worth
 * emphasising rather than comparing like-for-like.
 */
export function recentWeekWindows(now: Date, count: number): WeekWindow[] {
  const thisWeek = startOfWeek(now);
  const windows: WeekWindow[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - index * 7);
    windows.push({ start, end: endOfWeek(start) });
  }
  return windows;
}
