// Sample data for previewing the app before the challenge starts. It lives in
// its own database and uses a fixed preview date, so it never mixes with real
// data and wiping it is just deleting that database.

import { addDays, START } from './dates.js';
import { exercisesFor } from './plan.js';

export const SAMPLE_DB = '36hard-sample';
export const SAMPLE_TODAY = '2026-11-16'; // Mon, Day 15, a check-in day

const BASE_KG = {
  'bench-press-or-dumbbell-press': 37.5,
  'seated-cable-row': 45,
  'incline-dumbbell-press': 14,
  'bicep-curls': 10,
  'goblet-squat-or-leg-press': 20,
  'reverse-lunges': 10,
  'romanian-deadlift-with-dumbbells': 18,
  'kettlebell-swings': 16,
  'lat-pulldown-or-pull-ups': 40,
  'dumbbell-shoulder-press': 12,
  'cable-chest-fly': 10,
  'tricep-pushdowns-or-dips': 20,
  'trap-bar-or-kettlebell-deadlift': 60,
  'bulgarian-split-squat': 10,
  'farmers-carry': 20,
  'suitcase-carry': 16,
  'pallof-press': 10,
  'circuit-kb-swing': 16,
  'circuit-goblet-squat': 16,
  'circuit-kb-row': 16,
};

// [date offset from Day 1, session]
const STRENGTH = [
  [0, 'upperA'], [1, 'lowerA'], [2, 'circuit'], [3, 'upperB'], [4, 'lowerB'],
  [7, 'upperA'], [8, 'lowerA'], [10, 'upperB'], [11, 'lowerB'], [12, 'circuit'],
];

function workoutFor(date, session, week) {
  const sets = {};
  for (const ex of exercisesFor(session, 'gym')) {
    const kg = ex.load ? (BASE_KG[ex.id] ?? 12) + (week - 1) * 2.5 : null;
    sets[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({
      kg,
      // Week 1 falls short on the last set; week 2 hits the top of every range.
      reps: ex.min == null ? 14 - i : week === 1 && i === ex.sets - 1 ? ex.min : ex.max,
    }));
  }
  return { date, session, mode: 'gym', sets, completedAt: `${date}T07:40:00.000Z` };
}

export function buildSampleData() {
  const days = {};
  const workouts = {};
  for (let i = 0; i < 14; i++) {
    const k = addDays(START, i);
    const bike = i % 3 === 1;
    days[k] = {
      noAlcohol: true, diet: true, planned: true, water: true, photo: true,
      cardio: bike
        ? { done: true, type: 'bike', minutes: 30, outdoors: false }
        : { done: true, type: 'steps', steps: 10400 + i * 230, outdoors: i % 2 === 0 },
      strength: { done: false },
    };
  }
  for (const [offset, session] of STRENGTH) {
    const k = addDays(START, offset);
    workouts[k] = workoutFor(k, session, offset < 7 ? 1 : 2);
    days[k].strength = { done: true };
  }
  days[SAMPLE_TODAY] = {
    noAlcohol: true, water: true,
    cardio: { done: false, type: 'steps' },
    strength: { done: false },
  };
  const checkins = {
    '2026-11-02': { weightKg: 88.4, waistCm: 98.0, note: 'Baseline. Bit sluggish, sleep 6 h.' },
    '2026-11-09': { weightKg: 87.1, waistCm: 96.5, note: 'More energy. Sleep better.' },
  };
  return { settings: { weightUnit: 'kg', waistUnit: 'cm', location: 'gym' }, days, workouts, checkins };
}
