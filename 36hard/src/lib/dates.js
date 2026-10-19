// Date helpers. Every date in the app is a local calendar day held as a
// 'YYYY-MM-DD' key, so string comparison gives chronological order and
// clock changes (BST ends 25 Oct) never shift a day.

export const START = '2026-11-02';
export const END = '2026-12-07';
export const TOTAL_DAYS = 36;
export const WEEK_TARGET = 5;
export const OUTDOOR_TARGET = 3;

const DAY_MS = 86400000;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');

function utc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms) {
  const t = new Date(ms);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const isKey = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Local calendar day of a Date. */
export function toKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const addDays = (key, n) => fromUtc(utc(key) + n * DAY_MS);

/** Whole days from a to b (positive when b is later). */
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / DAY_MS);

/** 0 = Monday … 6 = Sunday. */
export const weekday = (key) => (new Date(utc(key)).getUTCDay() + 6) % 7;

/** Day 1 is 2 Nov. Values outside 1–36 mean before or after the challenge. */
export const dayNumber = (key) => diffDays(START, key) + 1;

export const isChallengeDay = (key) => key >= START && key <= END;

export const challengeDays = () => Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(START, i));

/** Five Monday–Sunday weeks. Day 36 (Mon 7 Dec) belongs to none of them. */
export const WEEKS = [0, 1, 2, 3, 4].map((i) => ({
  index: i,
  number: i + 1,
  start: addDays(START, i * 7),
  end: addDays(START, i * 7 + 6),
}));

export function weekOf(key) {
  const n = dayNumber(key);
  if (n < 1 || n > 35) return null;
  return WEEKS[Math.floor((n - 1) / 7)];
}

export function daysInRange(start, end) {
  const out = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

export const CHECKIN_DAYS = [0, 7, 14, 21, 28, 35].map((i) => addDays(START, i));

export function checkinLabel(key) {
  const i = CHECKIN_DAYS.indexOf(key);
  if (i === 0) return 'Day 0 baseline';
  if (i === CHECKIN_DAYS.length - 1) return 'Final check-in';
  if (i > 0) return `Week ${i} check-in`;
  return 'Check-in';
}

export const isCheckinDay = (key) => CHECKIN_DAYS.includes(key);

/** 02/11/2026 */
export function formatUK(key) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** Mon 2 Nov */
export function formatShort(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS[weekday(key)].slice(0, 3)} ${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

/** Monday 2 November */
export function formatLong(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS[weekday(key)]} ${d} ${MONTHS[m - 1]}`;
}

export const weekdayName = (key) => WEEKDAYS[weekday(key)];

/**
 * Who may change a day's ticks:
 *  'free'    – today or yesterday
 *  'confirm' – older; needs a confirm step first
 *  'locked'  – the future
 */
export function editAccess(key, today) {
  if (key > today) return 'locked';
  return diffDays(key, today) <= 1 ? 'free' : 'confirm';
}
