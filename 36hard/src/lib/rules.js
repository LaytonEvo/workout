// The challenge rules engine. Pure functions over the `days` map
// ({ 'YYYY-MM-DD': dayRecord }) and today's key, so the status is always
// derived from the data and never stored: ticking yesterday after midnight
// turns it from missed to passed.

import {
  START, END, WEEKS, WEEK_TARGET, challengeDays, daysInRange, dayNumber, isChallengeDay, weekOf,
} from './dates.js';

export const RULES = [
  { id: 'noAlcohol', n: 1, title: 'No alcohol', strict: true },
  { id: 'diet', n: 2, title: 'Stuck to the diet and logged all food', strict: true },
  { id: 'planned', n: 3, title: "Planned tomorrow's food", strict: true },
  { id: 'water', n: 4, title: 'Drank 3 litres of water', strict: true },
  { id: 'cardio', n: 5, title: 'Daily cardio', strict: true },
  { id: 'strength', n: 6, title: 'Strength workout', strict: false },
  { id: 'photo', n: 7, title: 'Progress photo taken', strict: true },
];

export const STRICT_RULES = RULES.filter((r) => r.strict);

export function isTicked(day, id) {
  if (!day) return false;
  if (id === 'cardio') return !!day.cardio?.done;
  if (id === 'strength') return !!day.strength?.done;
  return !!day[id];
}

export const dayComplete = (day) => STRICT_RULES.every((r) => isTicked(day, r.id));

export const strengthDone = (days, key) => isTicked(days[key], 'strength');

/**
 * 'passed' – all strict rules ticked (today included)
 * 'pending' – today, not yet complete
 * 'missed' – a past day left incomplete
 * 'future' / 'outside'
 */
export function dayState(key, days, today) {
  if (!isChallengeDay(key)) return 'outside';
  if (key > today) return 'future';
  if (dayComplete(days[key])) return 'passed';
  return key === today ? 'pending' : 'missed';
}

/**
 * Strength progress for one Monday–Sunday week.
 * state: 'future' | 'open' | 'atRisk' (5 no longer reachable) | 'passed' | 'failed'
 */
export function weekState(week, days, today) {
  const keys = daysInRange(week.start, week.end);
  const count = keys.filter((k) => strengthDone(days, k)).length;
  if (today < week.start) return { week, count, state: 'future', daysLeft: 7 };
  if (today > week.end) return { week, count, state: count >= WEEK_TARGET ? 'passed' : 'failed', daysLeft: 0 };
  const openDays = keys.filter((k) => k >= today && !strengthDone(days, k)).length;
  const daysLeft = keys.filter((k) => k >= today).length;
  let state = 'open';
  if (count >= WEEK_TARGET) state = 'passed';
  else if (count + openDays < WEEK_TARGET) state = 'atRisk';
  return { week, count, state, daysLeft, needed: Math.max(0, WEEK_TARGET - count) };
}

/** Week progress for the week containing `key`, or null on Day 36 / outside. */
export function weekStateFor(key, days, today) {
  const w = weekOf(key);
  return w ? weekState(w, days, today) : null;
}

/** Longest run of consecutive passed days ending at `fromKey` (walking back). */
function runEndingAt(fromKey, days) {
  let n = 0;
  for (const k of challengeDays().filter((d) => d <= fromKey).reverse()) {
    if (!dayComplete(days[k])) break;
    n++;
  }
  return n;
}

export function currentStreak(days, today) {
  const last = today > END ? END : today;
  if (last < START) return 0;
  // An unfinished today doesn't break the streak yet.
  const from = dayComplete(days[last]) ? last : challengeDays().filter((d) => d < last).pop();
  return from ? runEndingAt(from, days) : 0;
}

export function bestStreak(days, today) {
  let best = 0, run = 0;
  for (const k of challengeDays()) {
    if (k > today) break;
    run = dayComplete(days[k]) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Overall challenge status.
 *  phase: 'before' | 'during' | 'after'
 *  failed: the first break (a missed day, or a week that ended under 5
 *          strength sessions), with the day it broke on.
 */
export function challengeStatus(days, today) {
  const phase = today < START ? 'before' : today > END ? 'after' : 'during';
  const breaks = [];
  for (const k of challengeDays()) {
    if (k < today && !dayComplete(days[k])) breaks.push({ key: k, day: dayNumber(k), reason: 'missed' });
  }
  for (const w of WEEKS) {
    const ws = weekState(w, days, today);
    if (ws.state === 'failed') {
      breaks.push({ key: w.end, day: dayNumber(w.end), reason: 'week', week: w.number, count: ws.count });
    }
  }
  breaks.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.reason === 'missed' ? -1 : 1));
  const daysPassed = challengeDays().filter((k) => k <= today && dayComplete(days[k])).length;
  return {
    phase,
    failed: breaks.length > 0,
    brokeOn: breaks[0] || null,
    breaks,
    daysPassed,
    streak: currentStreak(days, today),
  };
}

export function describeBreak(b) {
  if (!b) return '';
  return b.reason === 'missed'
    ? `Day ${b.day} missed`
    : `Week ${b.week} ended on ${b.count}/${WEEK_TARGET} strength sessions`;
}

export function outdoorCount(days, keys) {
  return keys.filter((k) => days[k]?.cardio?.done && days[k]?.cardio?.outdoors).length;
}

export function cardioSplit(days, today) {
  const out = { steps: 0, bike: 0, outdoors: 0 };
  for (const k of challengeDays()) {
    if (k > today) break;
    const c = days[k]?.cardio;
    if (!c?.done) continue;
    if (c.type === 'bike') out.bike++;
    else out.steps++;
    if (c.outdoors) out.outdoors++;
  }
  return out;
}
