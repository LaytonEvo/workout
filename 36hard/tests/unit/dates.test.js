import { describe, expect, it } from 'vitest';
import {
  CHECKIN_DAYS, END, START, WEEKS, addDays, challengeDays, checkinLabel, dayNumber, diffDays,
  editAccess, formatLong, formatShort, formatUK, isChallengeDay, toKey, weekOf, weekday,
} from '../../src/lib/dates.js';

describe('day numbering', () => {
  it('starts on Monday 2 November as Day 1 and ends on Monday 7 December as Day 36', () => {
    expect(dayNumber('2026-11-02')).toBe(1);
    expect(dayNumber('2026-12-07')).toBe(36);
    expect(dayNumber(END)).toBe(36);
    expect(weekday(START)).toBe(0);
    expect(weekday(END)).toBe(0);
  });

  it('numbers days across the month boundary', () => {
    expect(dayNumber('2026-11-30')).toBe(29);
    expect(dayNumber('2026-12-01')).toBe(30);
  });

  it('gives 0 or less before the start and 37+ after the end', () => {
    expect(dayNumber('2026-11-01')).toBe(0);
    expect(dayNumber('2026-10-19')).toBe(-13);
    expect(dayNumber('2026-12-08')).toBe(37);
    expect(isChallengeDay('2026-11-01')).toBe(false);
    expect(isChallengeDay('2026-12-08')).toBe(false);
    expect(isChallengeDay('2026-12-07')).toBe(true);
  });

  it('lists exactly 36 challenge days', () => {
    const days = challengeDays();
    expect(days).toHaveLength(36);
    expect(days[0]).toBe(START);
    expect(days[35]).toBe(END);
  });

  it('is unaffected by the clocks going back (25 Oct) and uses local dates', () => {
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(toKey(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02');
    expect(toKey(new Date(2026, 10, 3, 0, 1))).toBe('2026-11-03');
  });
});

describe('week boundaries', () => {
  it('has five Monday–Sunday weeks', () => {
    expect(WEEKS.map((w) => [w.start, w.end])).toEqual([
      ['2026-11-02', '2026-11-08'],
      ['2026-11-09', '2026-11-15'],
      ['2026-11-16', '2026-11-22'],
      ['2026-11-23', '2026-11-29'],
      ['2026-11-30', '2026-12-06'],
    ]);
    WEEKS.forEach((w) => {
      expect(weekday(w.start)).toBe(0);
      expect(weekday(w.end)).toBe(6);
    });
  });

  it('puts Sunday in the same week as the Monday before it', () => {
    expect(weekOf('2026-11-08').number).toBe(1);
    expect(weekOf('2026-11-09').number).toBe(2);
  });

  it('treats the final week (30 Nov–6 Dec) like any other', () => {
    expect(weekOf('2026-11-30').number).toBe(5);
    expect(weekOf('2026-12-06').number).toBe(5);
  });

  it('leaves Day 36 (Mon 7 Dec) in no week', () => {
    expect(weekOf('2026-12-07')).toBeNull();
    expect(weekOf('2026-11-01')).toBeNull();
  });
});

describe('check-in days', () => {
  it('are the Mondays from 2 Nov to 7 Dec', () => {
    expect(CHECKIN_DAYS).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07']);
    expect(checkinLabel('2026-11-02')).toBe('Day 0 baseline');
    expect(checkinLabel('2026-11-16')).toBe('Week 2 check-in');
    expect(checkinLabel('2026-12-07')).toBe('Final check-in');
  });
});

describe('UK formatting', () => {
  it('formats as DD/MM/YYYY and with UK day names', () => {
    expect(formatUK('2026-11-02')).toBe('02/11/2026');
    expect(formatShort('2026-12-07')).toBe('Mon 7 Dec');
    expect(formatLong('2026-11-12')).toBe('Thursday 12 November');
  });
});

describe('editing a past day', () => {
  const today = '2026-11-12';
  it('lets today and yesterday be edited freely', () => {
    expect(editAccess('2026-11-12', today)).toBe('free');
    expect(editAccess('2026-11-11', today)).toBe('free');
  });
  it('asks for confirmation on anything older', () => {
    expect(editAccess('2026-11-10', today)).toBe('confirm');
    expect(editAccess('2026-11-02', today)).toBe('confirm');
  });
  it('blocks the future', () => {
    expect(editAccess('2026-11-13', today)).toBe('locked');
  });
  it('treats yesterday as free across a month boundary', () => {
    expect(editAccess('2026-11-30', '2026-12-01')).toBe('free');
  });
});
