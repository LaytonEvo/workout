// One shared timer store, so a running timer survives switching screens.
// Everything is computed from timestamps, which keeps it right after the
// phone has locked or the tab has been in the background.

import { alertEnd, alertTick, unlockAudio } from './sound.js';

let state = {
  sessionStart: null, // ms timestamp while running
  sessionAccum: 0, // ms banked from earlier runs
  rest: null, // { endsAt, secs }
  interval: null, // { startedAt, phases, lastIndex }
};
const subs = new Set();
let ticker = null;
let wakeLock = null;

const emit = () => subs.forEach((fn) => fn(state));
const set = (patch) => { state = { ...state, ...patch }; syncTicker(); emit(); };

export const getTimer = () => state;
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

function anyRunning(s = state) { return !!(s.sessionStart || s.rest || s.interval); }

function syncTicker() {
  if (anyRunning() && !ticker) {
    ticker = setInterval(tick, 250);
    requestWakeLock();
  } else if (!anyRunning() && ticker) {
    clearInterval(ticker);
    ticker = null;
    releaseWakeLock();
  }
}

function tick() {
  const now = Date.now();
  if (state.rest && now >= state.rest.endsAt) {
    state = { ...state, rest: null };
    alertEnd();
  }
  if (state.interval) {
    const info = intervalInfo(now);
    if (info.finished) {
      state = { ...state, interval: null };
      alertEnd();
    } else if (info.index !== state.interval.lastIndex) {
      state = { ...state, interval: { ...state.interval, lastIndex: info.index } };
      alertTick(info.phase.kind === 'work');
    }
  }
  syncTicker();
  emit();
}

export function sessionElapsed(now = Date.now()) {
  return state.sessionAccum + (state.sessionStart ? now - state.sessionStart : 0);
}

export function startSession() {
  unlockAudio();
  if (!state.sessionStart) set({ sessionStart: Date.now() });
}
export function pauseSession() {
  if (state.sessionStart) set({ sessionAccum: sessionElapsed(), sessionStart: null });
}
export function resetSession() { set({ sessionAccum: 0, sessionStart: null }); }

export function startRest(secs = 60) {
  unlockAudio();
  set({ rest: { endsAt: Date.now() + secs * 1000, secs } });
}
export function cancelRest() { set({ rest: null }); }
export const restLeft = (now = Date.now()) => (state.rest ? Math.max(0, state.rest.endsAt - now) : 0);

export function startInterval(phases) {
  unlockAudio();
  set({ interval: { startedAt: Date.now(), phases, lastIndex: 0 } });
  alertTick(true);
}
export function stopInterval() { set({ interval: null }); }

export function intervalInfo(now = Date.now()) {
  const iv = state.interval;
  if (!iv) return null;
  let t = (now - iv.startedAt) / 1000;
  for (let i = 0; i < iv.phases.length; i++) {
    const p = iv.phases[i];
    if (t < p.secs) return { index: i, phase: p, left: p.secs - t, total: iv.phases.length, next: iv.phases[i + 1] };
    t -= p.secs;
  }
  return { finished: true };
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch { /* not allowed or unsupported */ }
}
function releaseWakeLock() {
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && anyRunning()) { requestWakeLock(); tick(); }
  });
}

export function formatClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
