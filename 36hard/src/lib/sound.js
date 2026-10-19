// Beep and vibrate where the browser allows. iOS only plays audio from a
// context created during a tap, so the timers call unlockAudio() on start.

let ctx = null;

export function unlockAudio() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function beep(freq, start, dur) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const vibrate = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

/** End of a rest or the whole circuit: three rising beeps. */
export function alertEnd() {
  beep(660, 0, 0.15); beep(880, 0.2, 0.15); beep(1100, 0.4, 0.3);
  vibrate([200, 100, 200, 100, 300]);
}

/** Phase change within the interval timer. */
export function alertTick(work) {
  beep(work ? 990 : 520, 0, 0.18);
  vibrate(work ? [120, 60, 120] : 150);
}
