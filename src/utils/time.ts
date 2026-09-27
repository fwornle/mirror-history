/** Time helpers. Everything is expressed in *years from birth*, not dates. */

export const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

export const parseDate = (iso: string): Date => new Date(`${iso}T12:00:00Z`);

/** Years between two dates, signed, fractional. */
export const yearsBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / MS_PER_YEAR;

/** Shift a date by a fractional number of years. */
export const addYears = (base: Date, years: number): Date =>
  new Date(base.getTime() + years * MS_PER_YEAR);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "14 March 1971" — or "March 1971" / "1971" when the source lacks precision. */
export function formatEventDate(date: Date, precision: 'day' | 'month' | 'year' = 'day'): string {
  const y = date.getUTCFullYear();
  if (precision === 'year') return String(y);
  if (precision === 'month') return `${MONTHS[date.getUTCMonth()]} ${y}`;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${y}`;
}

/**
 * An ISO date that is exactly 1 January carries no day information in this
 * dataset — it is the convention for "this year, date not significant".
 */
export const precisionOf = (iso: string): 'day' | 'year' =>
  iso.endsWith('-01-01') ? 'year' : 'day';

/** "27 years, 4 months" — the distance from birth, spoken the way people do. */
export function formatAge(years: number): string {
  const whole = Math.floor(Math.abs(years));
  const months = Math.round((Math.abs(years) - whole) * 12);
  if (whole === 0) return months <= 1 ? 'the first weeks' : `${months} months`;
  if (months === 0 || months === 12) return `${whole} ${whole === 1 ? 'year' : 'years'}`;
  return `${whole} ${whole === 1 ? 'yr' : 'yrs'} ${months} mo`;
}

/** Formats a year that may fall before year 1 without printing a negative. */
export const formatYear = (date: Date): string => {
  const y = date.getUTCFullYear();
  return y > 0 ? String(y) : `${1 - y} BC`;
};
