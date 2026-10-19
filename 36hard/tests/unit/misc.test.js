import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildExport, parseImport } from '../../src/lib/backup.js';
import { exercisesFor, shouldIncrease, circuitPhases, scheduledSession } from '../../src/lib/plan.js';
import { buildSampleData } from '../../src/lib/sample.js';
import { createStorage } from '../../src/lib/storage.js';
import { formatWaist, formatWeight, kgToStLb, stLbToKg } from '../../src/lib/units.js';

describe('units', () => {
  it('converts stone and pounds both ways', () => {
    expect(stLbToKg(14, 0)).toBeCloseTo(88.904, 2);
    expect(kgToStLb(88.904)).toEqual({ st: 14, lb: 0 });
    expect(kgToStLb(stLbToKg(13, 13.6))).toEqual({ st: 13, lb: 13.6 });
    expect(kgToStLb(stLbToKg(13, 13.98))).toEqual({ st: 14, lb: 0 });
    expect(formatWeight(88.4, 'st')).toBe('13 st 12.9 lb');
    expect(formatWaist(98, 'in')).toBe('38.6 in');
  });
});

describe('workout plan', () => {
  it('switches exercise lists between gym and home', () => {
    expect(exercisesFor('upperA', 'gym')[0].name).toBe('Bench press or dumbbell press');
    expect(exercisesFor('upperA', 'home')[0].name).toBe('Kettlebell floor press');
    const thuHome = exercisesFor('upperB', 'home').filter((e) => e.group === 'core').map((e) => e.name);
    expect(thuHome).toEqual(['Plank shoulder taps', 'Hollow hold']);
  });

  it('schedules Mon–Fri sessions and nothing at the weekend', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(scheduledSession)).toEqual(['upperA', 'lowerA', 'circuit', 'upperB', 'lowerB', null, null]);
  });

  it('makes crunch day 3 rounds of the circuit, 15 minutes', () => {
    const ex = exercisesFor('circuit', 'crunch');
    expect(ex).toHaveLength(5);
    expect(ex.every((e) => e.sets === 3)).toBe(true);
    const secs = circuitPhases(3).reduce((t, p) => t + p.secs, 0);
    expect(secs).toBe(15 * 60 - 20); // no rest after the final move
  });

  it('suggests more weight only when every set hit the top of the range', () => {
    const bench = exercisesFor('upperA', 'gym')[0]; // 3 × 8–10
    expect(shouldIncrease(bench, [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }, { kg: 40, reps: 10 }])).toBe(true);
    expect(shouldIncrease(bench, [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }, { kg: 40, reps: 9 }])).toBe(false);
    expect(shouldIncrease(bench, [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }])).toBe(false);
    const plank = exercisesFor('upperA', 'gym').find((e) => e.name === 'Plank');
    expect(shouldIncrease(plank, [{ reps: 40 }, { reps: 40 }, { reps: 40 }])).toBe(false);
  });
});

describe('export and import', () => {
  it('restores everything exactly through storage', async () => {
    const data = buildSampleData();
    const a = createStorage('test-a');
    await a.replaceAll(data);
    const exported = JSON.stringify(buildExport(await a.loadAll()));

    const b = createStorage('test-b');
    await b.put('days', '2026-11-30', { water: true }); // pre-existing data is replaced
    await b.replaceAll(parseImport(exported));
    expect(await b.loadAll()).toEqual(data);
  });

  it('rejects files that are not 36 Hard backups', () => {
    expect(() => parseImport('nope')).toThrow(/valid JSON/);
    expect(() => parseImport('{"app":"other"}')).toThrow(/36 Hard backup/);
    expect(() => parseImport(JSON.stringify({ app: '36-hard', schemaVersion: 1, data: { days: { bad: {} } } }))).toThrow(/valid date/);
    expect(() => parseImport(JSON.stringify({ app: '36-hard', schemaVersion: 99, data: {} }))).toThrow(/newer version/);
  });
});
