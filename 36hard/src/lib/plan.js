// The strength programme. Each session item names its gym and home variant;
// `exercisesFor` flattens a session into the list the Workout screen logs.

export const WARM_UP = '5 min easy Watt bike, skipping or brisk walk, then arm circles, hip openers and 10 bodyweight squats.';
export const SUPERSET_NOTE = 'Do the pair back to back, rest 60 seconds, repeat for 3 rounds.';
export const REST_SECONDS = 60;
export const CIRCUIT_WORK = 40;
export const CIRCUIT_REST = 20;

const CIRCUIT_MOVES = [
  { id: 'circuit-kb-swing', name: 'Kettlebell swings' },
  { id: 'circuit-goblet-squat', name: 'Goblet squats' },
  { id: 'circuit-push-up', name: 'Push-ups', load: false },
  { id: 'circuit-kb-row', name: 'Kettlebell rows' },
  { id: 'circuit-mountain-climber', name: 'Mountain climbers', load: false },
];

const CIRCUIT_CORE = [
  { gym: 'Reverse crunches', sets: 3, reps: 12, load: false },
  { gym: 'Hollow hold', sets: 3, reps: 20, unit: 'sec', load: false },
];

export const SESSIONS = {
  upperA: {
    key: 'upperA', title: 'Upper A', focus: 'Chest, back, arms', weekday: 0, format: 'superset',
    blocks: [
      [
        { slot: 'A1', gym: 'Bench press or dumbbell press', home: 'Kettlebell floor press', sets: 3, reps: [8, 10] },
        { slot: 'A2', gym: 'Seated cable row', home: 'Kettlebell bent-over row', sets: 3, reps: 10 },
      ],
      [
        { slot: 'B1', gym: 'Incline dumbbell press', home: 'Push-ups', homeLoad: false, sets: 3, reps: [10, 15] },
        { slot: 'B2', gym: 'Bicep curls', home: 'Kettlebell curls', sets: 3, reps: 12 },
      ],
    ],
    core: [
      { gym: 'Plank', sets: 3, reps: 40, unit: 'sec', load: false },
      { gym: 'Dead bugs', sets: 3, reps: 10, per: 'side', load: false },
    ],
  },
  lowerA: {
    key: 'lowerA', title: 'Lower A', focus: 'Legs and glutes', weekday: 1, format: 'superset',
    blocks: [
      [
        { slot: 'A1', gym: 'Goblet squat or leg press', home: 'Goblet squat', sets: 3, reps: 10 },
        { slot: 'A2', gym: 'Reverse lunges', home: 'Reverse lunges holding kettlebells', sets: 3, reps: 10, per: 'leg' },
      ],
      [
        { slot: 'B1', gym: 'Romanian deadlift with dumbbells', home: 'Romanian deadlift with kettlebells', sets: 3, reps: 10 },
        { slot: 'B2', gym: 'Kettlebell swings', sets: 3, reps: 15 },
      ],
    ],
    core: [
      { gym: 'Suitcase carry', sets: 3, reps: 30, unit: 'm', per: 'side' },
      { gym: 'Side plank', sets: 3, reps: 30, unit: 'sec', per: 'side', load: false },
    ],
  },
  circuit: {
    key: 'circuit', title: 'Conditioning circuit', focus: 'Same at gym or home', weekday: 2, format: 'circuit',
    rounds: 4,
    core: CIRCUIT_CORE,
  },
  upperB: {
    key: 'upperB', title: 'Upper B', focus: 'Back, shoulders, arms', weekday: 3, format: 'superset',
    blocks: [
      [
        { slot: 'A1', gym: 'Lat pulldown or pull-ups', home: 'Heavy single-arm kettlebell row', sets: 3, reps: [8, 10] },
        { slot: 'A2', gym: 'Dumbbell shoulder press', home: 'Kettlebell shoulder press', sets: 3, reps: 10 },
      ],
      [
        { slot: 'B1', gym: 'Cable chest fly', home: 'Wide push-ups', homeLoad: false, sets: 3, reps: 12 },
        { slot: 'B2', gym: 'Tricep pushdowns or dips', home: 'Overhead kettlebell tricep extension', sets: 3, reps: 12 },
      ],
    ],
    core: [
      { gym: 'Pallof press', only: 'gym', sets: 3, reps: 10, per: 'side' },
      { gym: 'Ab wheel', only: 'gym', sets: 3, reps: 8, load: false },
      { gym: 'Plank shoulder taps', only: 'home', sets: 3, reps: 20, load: false },
      { gym: 'Hollow hold', only: 'home', sets: 3, reps: 20, unit: 'sec', load: false },
    ],
  },
  lowerB: {
    key: 'lowerB', title: 'Lower B', focus: 'Full body', weekday: 4, format: 'superset',
    blocks: [
      [
        { slot: 'A1', gym: 'Trap bar or kettlebell deadlift', home: 'Deadlift holding both kettlebells', sets: 3, reps: 8 },
        { slot: 'A2', gym: 'Bulgarian split squat', sets: 3, reps: 8, per: 'leg' },
      ],
      [
        { slot: 'B1', gym: 'Kettlebell swings', sets: 3, reps: 15 },
        { slot: 'B2', gym: "Farmer's carry", sets: 3, reps: 30, unit: 'm' },
      ],
    ],
    core: [
      { gym: 'Dead bugs', sets: 3, reps: 10, per: 'side', load: false },
      { gym: 'Side plank', sets: 3, reps: 30, unit: 'sec', per: 'side', load: false },
    ],
  },
};

export const SESSION_ORDER = ['upperA', 'lowerA', 'circuit', 'upperB', 'lowerB'];

/** The scheduled session for a weekday (0 = Mon), or null at the weekend. */
export const scheduledSession = (weekdayIndex) => SESSION_ORDER[weekdayIndex] || null;

export const slug = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function normalise(item, mode, group) {
  const name = mode === 'home' && item.home ? item.home : item.gym;
  const [min, max] = Array.isArray(item.reps) ? item.reps : [item.reps, item.reps];
  const modeLoad = mode === 'home' ? item.homeLoad : item.gymLoad;
  return {
    id: item.id || slug(name),
    slot: item.slot || null,
    group,
    name,
    sets: item.sets,
    min,
    max,
    unit: item.unit || 'reps',
    per: item.per || null,
    load: modeLoad ?? item.load ?? true,
  };
}

/**
 * Flat list of exercises to log.
 * mode: 'gym' | 'home' | 'crunch' (crunch = 3 rounds of the circuit, no core).
 */
export function exercisesFor(sessionKey, mode) {
  if (mode === 'crunch') return circuitMoves(3);
  const s = SESSIONS[sessionKey];
  if (!s) return [];
  const main = s.format === 'circuit'
    ? circuitMoves(s.rounds)
    : s.blocks.flatMap((pair, i) => pair.map((it) => normalise(it, mode, i === 0 ? 'A' : 'B')));
  const core = s.core.filter((it) => !it.only || it.only === mode).map((it) => normalise(it, mode, 'core'));
  return [...main, ...core];
}

function circuitMoves(rounds) {
  return CIRCUIT_MOVES.map((m) => ({
    id: m.id, slot: null, group: 'circuit', name: m.name, sets: rounds,
    min: null, max: null, unit: 'reps', per: null, load: m.load ?? true,
  }));
}

/** Interval timer phases for a circuit: 40 s work / 20 s rest through each move, per round. */
export function circuitPhases(rounds) {
  const phases = [];
  for (let r = 1; r <= rounds; r++) {
    CIRCUIT_MOVES.forEach((m, i) => {
      phases.push({ kind: 'work', label: m.name, secs: CIRCUIT_WORK, round: r });
      const last = r === rounds && i === CIRCUIT_MOVES.length - 1;
      if (!last) phases.push({ kind: 'rest', label: 'Rest', secs: CIRCUIT_REST, round: r });
    });
  }
  return phases;
}

export function sessionLabel(sessionKey, mode) {
  if (mode === 'crunch') return 'Crunch day · 15-minute circuit';
  return SESSIONS[sessionKey]?.title || 'Workout';
}

export function targetText(ex) {
  const reps = ex.min == null ? '40 s work' : ex.min === ex.max ? `${ex.min}` : `${ex.min}–${ex.max}`;
  const unit = ex.unit === 'sec' ? ' sec' : ex.unit === 'm' ? ' m' : '';
  const per = ex.per ? ` per ${ex.per}` : '';
  return ex.min == null ? `${ex.sets} rounds × 40 s` : `${ex.sets} × ${reps}${unit}${per}`;
}

/**
 * Should we suggest a heavier weight? True when every set last time was
 * logged with a weight and reached the top of the rep range.
 */
export function shouldIncrease(ex, lastSets) {
  if (!ex.load || ex.max == null || ex.unit !== 'reps' || !lastSets) return false;
  const filled = lastSets.filter((s) => s && s.reps != null && s.reps !== '');
  if (filled.length < ex.sets) return false;
  return filled.every((s) => Number(s.reps) >= ex.max && Number(s.kg) > 0);
}
