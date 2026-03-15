// utils/dateUtils.ts
import {
  add,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
  differenceInSeconds,
  differenceInWeeks,
  differenceInYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  formatDistance,
  formatRelative,
  getDaysInYear as gDaysInYear,
  getDay,
  getISOWeeksInYear,
  getMonth,
  getOverlappingDaysInIntervals,
  getQuarter,
  getWeekOfMonth,
  getYear,
  Interval,
  isAfter,
  isBefore,
  isEqual,
  isLastDayOfMonth,
  isLeapYear,
  isSameDay,
  isToday,
  isWeekend,
  isWithinInterval,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { format as formatTz, fromZonedTime, toZonedTime } from "date-fns-tz";
export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export const thirtyDaysFromNow = (): Date =>
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

export const fortyFiveMinutesFromNow = (): Date => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 45);
  return now;
};
export const tenMinutesAgo = (): Date => new Date(Date.now() - 10 * 60 * 1000);

export const threeMinutesAgo = (): Date => new Date(Date.now() - 3 * 60 * 1000);

export const anHourFromNow = (): Date => new Date(Date.now() + 60 * 60 * 1000);

export const calculateExpirationDate = (expiresIn: string = "15m"): Date => {
  // Match number + unit (m = minutes, h = hours, d = days)
  const match = expiresIn.match(/^(\d+)([mhd])$/);
  if (!match) throw new Error('Invalid format. Use "15m", "1h", or "2d".');
  const [value, unit] = match;
  const expirationDate = new Date();

  // Check the unit and apply accordingly
  switch (unit) {
    case "m": // minutes
      return add(expirationDate, { minutes: parseInt(value) });
    case "h": // hours
      return add(expirationDate, { hours: parseInt(value) });
    case "d": // days
      return add(expirationDate, { days: parseInt(value) });
    default:
      throw new Error('Invalid unit. Use "m", "h", or "d".');
  }
};

// Convert date to UTC
// Example: toUTC(new Date("2024-10-30T15:00:00")) -> "2024-10-30T15:00:00Z"
// Overload definitions
export function toUTC(date: Date, formatResult?: true): string;
export function toUTC(date: Date, formatResult: false): Date;
export function toUTC(date: Date, formatResult = true): string | Date {
  const utcDate = fromZonedTime(date, "UTC");
  return formatResult ? format(utcDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : utcDate;
}
// export function toUTC(date: Date, formatResult = true) {
//   const utcDate = fromZonedTime(date, "UTC");
//   return formatResult ? format(utcDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : utcDate;
// }

// Format date in a specific timezone
// Example: formatInTimeZone(new Date("2024-10-30T15:00:00"), 'America/New_York') -> "2024-10-30T11:00:00-04:00"
export function formatInTimeZone(
  date: Date,
  timeZone: string,
  dateFormat: string = "yyyy-MM-dd'T'HH:mm:ssXXX"
): string {
  const zonedDate = toZonedTime(date, timeZone);
  return formatTz(zonedDate, dateFormat, { timeZone });
}

// Relative time formatting
// Example: formatDateDistanceToNow(new Date("2024-10-27T15:00:00")) -> "3 days ago" (if today is 2024-10-30)
export function formatDateDistanceToNow(date: Date): string {
  return formatDistance(date, new Date(), { addSuffix: true });
}

// Relative date formatting based on another date
// Example: formatRelativeTo(new Date("2024-10-30T15:00:00"), new Date("2024-10-25T15:00:00")) -> "next Wednesday at 3:00 PM"
export function formatRelativeTo(
  date: Date,
  baseDate: Date = new Date()
): string {
  return formatRelative(date, baseDate);
}

// Custom date parsing with format
// Example: parseDateFromString("2024-10-30", "yyyy-MM-dd") -> Date object for 2024-10-30
export function parseDateFromString(
  dateString: string,
  dateFormat: string = "yyyy-MM-dd"
): Date {
  return parse(dateString, dateFormat, new Date());
}

// Parse ISO date string
// Example: parseISODate("2024-10-30T15:00:00Z") -> Date object for 2024-10-30T15:00:00Z
export function parseISODate(isoDateString: string): Date {
  return parseISO(isoDateString);
}

// Check if two dates fall within the same day, week, month, or year
// Example: isSameDayDate(new Date("2024-10-30"), new Date("2024-10-30")) -> true
export function isSameDayDate(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}
export function isSameWeekDate(date1: Date, date2: Date): boolean {
  return getWeekOfMonth(date1) === getWeekOfMonth(date2);
}
export function isSameMonthDate(date1: Date, date2: Date): boolean {
  return (
    getMonth(date1) === getMonth(date2) && getYear(date1) === getYear(date2)
  );
}
export function isSameYearDate(date1: Date, date2: Date): boolean {
  return getYear(date1) === getYear(date2);
}

// Get components of a date (day, month, year, quarter)
// Example: getDayOfDate(new Date("2024-10-30")) -> 3 (Wednesday)
export function getDayOfDate(date: Date): number {
  return getDay(date);
}
export function getMonthOfDate(date: Date): number {
  return getMonth(date) + 1;
} // months are 0-indexed, adding 1 to make it 1-12
export function getYearOfDate(date: Date): number {
  return getYear(date);
}
export function getQuarterOfDate(date: Date): number {
  return getQuarter(date);
}

// Fiscal quarter handling
// Example: getFiscalQuarter(new Date("2024-10-30"), 10) -> 1 (fiscal quarter starting in October)
export function getFiscalQuarter(
  date: Date,
  fiscalYearStartMonth: number = 10
): number {
  const fiscalQuarter =
    Math.floor(((getMonth(date) + (12 - fiscalYearStartMonth)) % 12) / 3) + 1;
  return fiscalQuarter;
}

// Get the number of days in month and year
// Example: getDaysInMonth(new Date("2024-10-30")) -> 31
export function getDaysInMonth(date: Date): number {
  return endOfMonth(date).getDate();
}
export function getDaysInYear(date: Date): number {
  return gDaysInYear(date);
}

// Get ISO week and week of the month
// Example: getISOWeekNumber(new Date("2024-10-30")) -> 44 (ISO week number)
export function getISOWeekNumber(date: Date): number {
  return getISOWeeksInYear(date);
}
export function getWeekOfMonthDate(date: Date): number {
  return getWeekOfMonth(date);
}

// Generate intervals of days, weeks, or months within a range
// Example: eachDayOfRange(new Date("2024-10-01"), new Date("2024-10-07")) -> [Date, Date, ..., Date] array for each day from Oct 1 to Oct 7
export function eachDayOfRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end });
}
export function eachWeekOfRange(start: Date, end: Date): Date[] {
  return eachWeekOfInterval({ start, end });
}
export function eachMonthOfRange(start: Date, end: Date): Date[] {
  return eachMonthOfInterval({ start, end });
}

// Check if a date is a holiday (example: New Year, Christmas)
// Example: isHoliday(new Date("2024-12-25")) -> true
export function isHoliday(date: Date): boolean {
  const month = getMonthOfDate(date);
  const day = getDayOfDate(date);
  return (month === 1 && day === 1) || (month === 12 && day === 25);
}

// Get overlapping days between two intervals
// Example: getOverlappingDays({ start: new Date("2024-10-01"), end: new Date("2024-10-10") }, { start: new Date("2024-10-05"), end: new Date("2024-10-15") }) -> 6
export function getOverlappingDays(range1: Interval, range2: Interval): number {
  return getOverlappingDaysInIntervals(range1, range2);
}

// Check if a date is last day of the month or within a specified range
// Example: isLastDayOfMonthDate(new Date("2024-10-31")) -> true
export function isLastDayOfMonthDate(date: Date): boolean {
  return isLastDayOfMonth(date);
}
export function isDateWithinRange(date: Date, start: Date, end: Date): boolean {
  return isWithinInterval(date, { start, end });
}

// Advanced time differences (years, months, days, hours, minutes, seconds)
// Example: differenceInDaysBetween(new Date("2024-10-30"), new Date("2024-10-25")) -> 5
export function differenceInDaysBetween(date1: Date, date2: Date): number {
  return differenceInDays(date1, date2);
}
export function differenceInWeeksBetween(date1: Date, date2: Date): number {
  return differenceInWeeks(date1, date2);
}
export function differenceInMonthsBetween(date1: Date, date2: Date): number {
  return differenceInMonths(date1, date2);
}
export function differenceInYearsBetween(date1: Date, date2: Date): number {
  return differenceInYears(date1, date2);
}
export function differenceInHoursBetween(date1: Date, date2: Date): number {
  return differenceInHours(date1, date2);
}
export function differenceInMinutesBetween(date1: Date, date2: Date): number {
  return differenceInMinutes(date1, date2);
}
export function differenceInSecondsBetween(date1: Date, date2: Date): number {
  return differenceInSeconds(date1, date2);
}

// Add or subtract time intervals to/from dates
// Example: addDaysToDate(new Date("2024-10-30"), 5) -> Date object for "2024-11-04"
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}
export function subtractDaysFromDate(date: Date, days: number): Date {
  return subDays(date, days);
}
export function addWeeksToDate(date: Date, weeks: number): Date {
  return addWeeks(date, weeks);
}
export function subtractWeeksFromDate(date: Date, weeks: number): Date {
  return subWeeks(date, weeks);
}
export function addMonthsToDate(date: Date, months: number): Date {
  return addMonths(date, months);
}
export function subtractMonthsFromDate(date: Date, months: number): Date {
  return subMonths(date, months);
}
export function addYearsToDate(date: Date, years: number): Date {
  return addYears(date, years);
}
export function subtractYearsFromDate(date: Date, years: number): Date {
  return subYears(date, years);
}

// Get start and end of a date unit (day, week, month, quarter, year)
// Example: startOfDayDate(new Date("2024-10-30")) -> Date object for start of the day on 2024-10-30
export function startOfDayDate(date: Date): Date {
  return startOfDay(date);
}
export function endOfDayDate(date: Date): Date {
  return endOfDay(date);
}
export function startOfWeekDate(date: Date): Date {
  return startOfWeek(date);
}
export function endOfWeekDate(date: Date): Date {
  return endOfWeek(date);
}
export function startOfMonthDate(date: Date): Date {
  return startOfMonth(date);
}
export function endOfMonthDate(date: Date): Date {
  return endOfMonth(date);
}
export function startOfQuarterDate(date: Date): Date {
  return startOfQuarter(date);
}
export function endOfQuarterDate(date: Date): Date {
  return endOfQuarter(date);
}
export function startOfYearDate(date: Date): Date {
  return startOfYear(date);
}
export function endOfYearDate(date: Date): Date {
  return endOfYear(date);
}

// Date checks (today, weekend, leap year, holiday)
// Example: isTodayDate(new Date()) -> true (if today)
export function isTodayDate(date: Date): boolean {
  return isToday(date);
}
export function isWeekendDate(date: Date): boolean {
  return isWeekend(date);
}
export function isLeapYearDate(date: Date): boolean {
  return isLeapYear(date);
}
export function isHolidayDate(date: Date): boolean {
  return isHoliday(date);
}

// Date Comparison
// Example: isDateBefore(new Date("2024-10-25"), new Date("2024-10-30")) -> true
export function isDateBefore(date1: Date, date2: Date): boolean {
  return isBefore(date1, date2);
}
export function isDateAfter(date1: Date, date2: Date): boolean {
  return isAfter(date1, date2);
}
export function isDateEqual(date1: Date, date2: Date): boolean {
  return isEqual(date1, date2);
}

// Flexible date formatting
// Example: formatDate(new Date("2024-10-30"), "MMMM dd, yyyy") -> "October 30, 2024"
export function formatDate(date: Date, pattern: string = "yyyy-MM-dd"): string {
  return format(date, pattern);
}
