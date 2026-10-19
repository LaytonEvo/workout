import { describe, expect, it } from 'vitest';
import { WEEKS, addDays, challengeDays } from '../../src/lib/dates.js';
import {
  bestStreak, cardioSplit, challengeStatus, currentStreak, dayComplete, dayState, weekState, weekStateFor,
} from '../../src/lib/rules.js';

const full = (strength = false, extra = {}) => ({
  noAlcohol: true, diet: true, planned: true, water: true, photo: true,
  cardio: { done: true, type: 'steps', steps: 10000 },
  strength: { done: strength },
  ...extra,
});

/** Every day passed from Day 1 up to (not including) `until`, Mon–Fri strength. */
function perfectUntil(until) {
  const days = {};
  for (const k of challengeDays()) {
    if (k >= until) break;
    const wd = (new Date(`${k}T12:00:00Z`).getUTCDay() + 6) % 7;
    days[k] = full(wd < 5);
  }
  return days;
}

describe('a single day', () => {
  it('passes only when all six strict rules are ticked', () => {
    expect(dayComplete(full())).toBe(true);
    for (const id of ['noAlcohol', 'diet', 'planned', 'water', 'photo']) {
      expect(dayComplete(full(false, { [id]: false }))).toBe(false);
    }
    expect(dayComplete(full(false, { cardio: { done: false } }))).toBe(false);
    expect(dayComplete(undefined)).toBe(false);
  });

  it('does not need the strength workout to pass', () => {
    expect(dayComplete(full(false))).toBe(true);
  });

  it('is pending today, missed once it has ended, passed if complete', () => {
    const days = { '2026-11-02': { noAlcohol: true } };
    expect(dayState('2026-11-02', days, '2026-11-02')).toBe('pending');
    expect(dayState('2026-11-02', days, '2026-11-03')).toBe('missed');
    expect(dayState('2026-11-03', days, '2026-11-02')).toBe('future');
    expect(dayState('2026-11-02', { '2026-11-02': full() }, '2026-11-03')).toBe('passed');
    expect(dayState('2026-11-01', {}, '2026-11-03')).toBe('outside');
  });
});

describe('challenge status', () => {
  it('is "before" and not failed ahead of 2 November', () => {
    const s = challengeStatus({}, '2026-10-19');
    expect(s.phase).toBe('before');
    expect(s.failed).toBe(false);
    expect(s.daysPassed).toBe(0);
  });

  it('stays on track while today is unfinished', () => {
    const s = challengeStatus({ '2026-11-02': { water: true } }, '2026-11-02');
    expect(s.phase).toBe('during');
    expect(s.failed).toBe(false);
  });

  it('fails on a missed day and reports which day broke it', () => {
    const days = perfectUntil('2026-11-12');
    delete days['2026-11-05'].photo; // Day 4 incomplete
    const s = challengeStatus(days, '2026-11-12');
    expect(s.failed).toBe(true);
    expect(s.brokeOn).toMatchObject({ key: '2026-11-05', day: 4, reason: 'missed' });
    expect(s.daysPassed).toBe(9); // 10 elapsed days, 1 missed
  });

  it('keeps counting days passed after a failure', () => {
    const days = perfectUntil('2026-11-20');
    delete days['2026-11-03'].water;
    expect(challengeStatus(days, '2026-11-20').daysPassed).toBe(17); // 18 elapsed, 1 missed
  });

  it('recovers when a missed day is later ticked off (editing a past day)', () => {
    const days = perfectUntil('2026-11-05');
    days['2026-11-03'] = { ...days['2026-11-03'], diet: false };
    expect(challengeStatus(days, '2026-11-05').failed).toBe(true);
    days['2026-11-03'] = { ...days['2026-11-03'], diet: true };
    expect(challengeStatus(days, '2026-11-05').failed).toBe(false);
  });

  it('fails when a week ends under 5 strength sessions, dated on that Sunday', () => {
    const days = perfectUntil('2026-11-10');
    days['2026-11-06'].strength.done = false; // only 4 in week 1
    const mid = challengeStatus(days, '2026-11-08'); // Sunday, week not over yet
    expect(mid.failed).toBe(false);
    const after = challengeStatus(days, '2026-11-09');
    expect(after.failed).toBe(true);
    expect(after.brokeOn).toMatchObject({ key: '2026-11-08', day: 7, reason: 'week', week: 1, count: 4 });
  });

  it('reports the earliest break when there are several', () => {
    const days = perfectUntil('2026-11-20');
    days['2026-11-04'].strength.done = false; // week 1 → 4/5, breaks Sun 8 Nov
    delete days['2026-11-11'].photo; // missed Day 10
    delete days['2026-11-03'].water; // missed Day 2 – earliest
    const s = challengeStatus(days, '2026-11-20');
    expect(s.brokeOn.key).toBe('2026-11-03');
    expect(s.breaks.map((b) => b.key)).toEqual(['2026-11-03', '2026-11-08', '2026-11-11']);
  });

  it('is complete after 7 December with all 36 days passed', () => {
    const days = perfectUntil('2026-12-08');
    const s = challengeStatus(days, '2026-12-08');
    expect(s.phase).toBe('after');
    expect(s.failed).toBe(false);
    expect(s.daysPassed).toBe(36);
  });

  it('does not need any strength session on Day 36', () => {
    const days = perfectUntil('2026-12-08');
    days['2026-12-07'].strength.done = false;
    expect(challengeStatus(days, '2026-12-08').failed).toBe(false);
  });

  it('judges the final week (30 Nov–6 Dec) the same way', () => {
    const days = perfectUntil('2026-12-08');
    days['2026-12-01'].strength.done = false;
    days['2026-12-07'].strength.done = true; // Day 36 can't make up for it
    const s = challengeStatus(days, '2026-12-08');
    expect(s.brokeOn).toMatchObject({ key: '2026-12-06', reason: 'week', week: 5, count: 4 });
  });
});

describe('weekly strength target', () => {
  const w1 = WEEKS[0];

  it('counts sessions in the Monday–Sunday week', () => {
    const days = perfectUntil('2026-11-05'); // Mon, Tue, Wed done
    expect(weekState(w1, days, '2026-11-05')).toMatchObject({ count: 3, state: 'open', needed: 2 });
  });

  it('allows sessions on any day, including the weekend', () => {
    const days = {
      '2026-11-02': full(true), '2026-11-03': full(true), '2026-11-05': full(true),
      '2026-11-07': full(true), '2026-11-08': full(true),
    };
    expect(weekState(w1, days, '2026-11-09')).toMatchObject({ count: 5, state: 'passed' });
  });

  it('flags a week that can no longer reach 5', () => {
    const days = { '2026-11-02': full(true) }; // 1 done, Fri–Sun left = 3 days
    expect(weekState(w1, days, '2026-11-06').state).toBe('atRisk');
    expect(weekState(w1, days, '2026-11-05').state).toBe('open'); // 1 + 4 days left
  });

  it('counts a session already done today as done', () => {
    const days = perfectUntil('2026-11-06');
    days['2026-11-06'] = full(true);
    expect(weekState(w1, days, '2026-11-06')).toMatchObject({ count: 5, state: 'passed' });
  });

  it('returns null for Day 36', () => {
    expect(weekStateFor('2026-12-07', {}, '2026-12-07')).toBeNull();
  });

  it('is "future" before the week starts', () => {
    expect(weekState(WEEKS[1], {}, '2026-11-08').state).toBe('future');
  });
});

describe('streaks and cardio', () => {
  it('counts the current streak without breaking on an unfinished today', () => {
    const days = perfectUntil('2026-11-07');
    expect(currentStreak(days, '2026-11-07')).toBe(5);
    days['2026-11-07'] = full();
    expect(currentStreak(days, '2026-11-07')).toBe(6);
  });

  it('resets the streak after a missed day', () => {
    const days = perfectUntil('2026-11-10');
    delete days['2026-11-05'].water;
    expect(currentStreak(days, '2026-11-10')).toBe(4); // 6–9 Nov
    expect(bestStreak(days, '2026-11-10')).toBe(4);
  });

  it('splits cardio between steps and bike and counts outdoors', () => {
    const days = {
      '2026-11-02': full(false, { cardio: { done: true, type: 'steps', outdoors: true } }),
      '2026-11-03': full(false, { cardio: { done: true, type: 'bike', minutes: 30 } }),
      '2026-11-04': full(false, { cardio: { done: false, type: 'bike' } }),
    };
    expect(cardioSplit(days, '2026-11-05')).toEqual({ steps: 1, bike: 1, outdoors: 1 });
  });

  it('has no break on any day in a perfect run', () => {
    const days = perfectUntil(addDays('2026-12-07', 1));
    expect(challengeStatus(days, '2026-12-07').breaks).toEqual([]);
  });
});
