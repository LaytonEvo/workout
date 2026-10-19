import { useEffect, useState } from 'preact/hooks';
import { Icon, NumberInput, Segmented } from '../components/ui.jsx';
import { editAccess, formatLong, formatShort, isChallengeDay, isKey, START, weekday } from '../lib/dates.js';
import {
  CIRCUIT_REST, CIRCUIT_WORK, REST_SECONDS, SESSION_ORDER, SESSIONS, SUPERSET_NOTE, WARM_UP,
  circuitPhases, exercisesFor, scheduledSession, sessionLabel, shouldIncrease, targetText,
} from '../lib/plan.js';
import * as timer from '../lib/timer.js';
import { useStore } from '../store.js';

function useTimer() {
  const [, force] = useState(0);
  useEffect(() => timer.subscribe(() => force((n) => n + 1)), []);
  useEffect(() => {
    // Keep the session clock moving even when nothing else ticks.
    const id = setInterval(() => timer.getTimer().sessionStart && force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return timer.getTimer();
}

/** Most recent earlier log of an exercise. */
function lastFor(workouts, exId, beforeKey) {
  const keys = Object.keys(workouts).filter((k) => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const sets = workouts[k].sets?.[exId];
    if (sets?.some((s) => s && (s.reps != null || s.kg != null))) return { date: k, sets };
  }
  return null;
}

const fmtSet = (s, ex) => {
  if (!s || s.reps == null) return '–';
  const unit = ex.unit === 'sec' ? 's' : ex.unit === 'm' ? ' m' : '';
  return ex.load && s.kg != null ? `${s.kg}×${s.reps}${unit}` : `${s.reps}${unit}`;
};

export function Workout({ param }) {
  const { data, settings, today, actions } = useStore();
  const date = isKey(param) ? param : today;
  const logged = data.workouts[date];
  const [chosen, setChosen] = useState(null);
  const [crunch, setCrunch] = useState(param === 'crunch');
  const [picking, setPicking] = useState(false);
  const t = useTimer();

  const scheduled = scheduledSession(weekday(date));
  const sessionKey = logged?.session || chosen || scheduled || (crunch ? 'circuit' : null);
  const mode = logged ? logged.mode : crunch ? 'crunch' : settings.location;
  const session = SESSIONS[sessionKey];
  const loggable = isChallengeDay(date) && date <= today;
  const editable = loggable && actions.canEdit(date);
  const access = editAccess(date, today);
  const done = !!logged?.completedAt;
  const exercises = sessionKey ? exercisesFor(sessionKey, mode) : [];
  const isCircuit = mode === 'crunch' || session?.format === 'circuit';
  const rounds = mode === 'crunch' ? 3 : session?.rounds;

  const base = () => logged || { date, session: sessionKey, mode, sets: {}, startedAt: new Date().toISOString() };

  const setMode = (m) => {
    if (logged) actions.saveWorkout(date, { ...logged, mode: m });
    else if (m === 'crunch') setCrunch(true);
    else { setCrunch(false); actions.updateSettings({ location: m }); }
  };
  const pickSession = (k) => {
    setPicking(false);
    setChosen(k);
    if (logged) actions.saveWorkout(date, { ...logged, session: k, mode: logged.mode === 'crunch' ? settings.location : logged.mode });
    else setCrunch(false);
  };
  const updateSet = (exId, i, field, value) => {
    const w = base();
    const sets = [...(w.sets[exId] || [])];
    sets[i] = { ...(sets[i] || {}), [field]: value };
    actions.saveWorkout(date, { ...w, sets: { ...w.sets, [exId]: sets } });
  };
  const markDone = async () => {
    if (!(await actions.requestEdit(date))) return;
    actions.saveWorkout(date, { ...base(), completedAt: new Date().toISOString() });
    actions.updateDay(date, { strength: { done: true } });
    timer.pauseSession();
    actions.toast('Session done. Rule 6 ticked.');
  };
  const undoDone = async () => {
    if (!(await actions.requestEdit(date))) return;
    actions.saveWorkout(date, { ...logged, completedAt: null });
    actions.updateDay(date, { strength: { done: false } });
  };

  const groups = isCircuit
    ? [{ title: `Circuit · ${rounds} rounds`, note: `${CIRCUIT_WORK} s work, ${CIRCUIT_REST} s rest through all five moves. That's one round.`, items: exercises.filter((e) => e.group === 'circuit') }]
    : [
      { title: 'Superset A', note: SUPERSET_NOTE, items: exercises.filter((e) => e.group === 'A') },
      { title: 'Superset B', note: SUPERSET_NOTE, items: exercises.filter((e) => e.group === 'B') },
    ];
  const core = exercises.filter((e) => e.group === 'core');
  if (core.length) groups.push({ title: 'Core finisher · 5 min', note: null, items: core });

  return (
    <>
      <header class="page-head">
        <span class="eyebrow">{date === today ? 'Today' : formatLong(date)} · {sessionKey ? (mode === 'crunch' ? 'Crunch day' : session.focus) : 'Choose a session'}</span>
        <h1>{sessionKey ? sessionLabel(sessionKey, mode) : 'Workout'}</h1>
        {!loggable && <p class="note">{date < START ? 'Preview. Logging opens on Day 1.' : 'Logging is only open for challenge days up to today.'}</p>}
        {loggable && access === 'confirm' && !editable && (
          <button type="button" class="note note-btn" onClick={() => actions.requestEdit(date)}>
            <Icon name="lock" size={16} /> Older day. Tap to unlock editing.
          </button>
        )}
      </header>

      <div class="workout-controls">
        {mode !== 'crunch' && sessionKey && (
          <Segmented label="Location" value={mode} onChange={setMode}
            options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
        )}
        <div class="chip-row">
          {mode === 'crunch'
            ? <button type="button" class="chip" onClick={() => setMode(settings.location)}>Back to full session</button>
            : <button type="button" class="chip accent" onClick={() => setMode('crunch')}>Crunch day · 15 min</button>}
          <button type="button" class="chip" aria-expanded={picking || !sessionKey} onClick={() => setPicking(!picking)}>Choose session</button>
        </div>
        {(picking || !sessionKey) && (
          <div class="session-picker" role="list">
            {SESSION_ORDER.map((k) => (
              <button type="button" role="listitem" class={`session-opt ${k === sessionKey ? 'on' : ''}`} onClick={() => pickSession(k)}>
                <strong>{SESSIONS[k].title}</strong>
                <span>{SESSIONS[k].focus}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {sessionKey && (
        <>
          <TimerPanel t={t} isCircuit={isCircuit} rounds={rounds} />

          {mode !== 'crunch' && (
            <section class="section">
              <h2 class="group-title">Warm-up · 5 min</h2>
              <p class="muted small">{WARM_UP}</p>
            </section>
          )}

          {groups.map((g) => (
            <section class="section">
              <h2 class="group-title">{g.title}</h2>
              {g.note && <p class="muted small">{g.note}</p>}
              <div class="ex-list">
                {g.items.map((ex) => (
                  <ExerciseCard ex={ex} sets={logged?.sets?.[ex.id] || []} last={lastFor(data.workouts, ex.id, date)}
                    disabled={!editable} onSet={(i, f, v) => updateSet(ex.id, i, f, v)} />
                ))}
              </div>
            </section>
          ))}

          <div class="done-bar">
            {done ? (
              <div class="done-state">
                <span><Icon name="check" /> Session done{date === today ? ' today' : ` on ${formatShort(date)}`}</span>
                <button type="button" class="btn small ghost" disabled={!loggable} onClick={undoDone}>Undo</button>
              </div>
            ) : (
              <button type="button" class="btn primary block big" disabled={!loggable} onClick={markDone}>
                Mark session done
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ExerciseCard({ ex, sets, last, disabled, onSet }) {
  const increase = shouldIncrease(ex, last?.sets);
  const unitLabel = ex.unit === 'sec' ? 'sec' : ex.unit === 'm' ? 'm' : 'reps';
  return (
    <div class="ex">
      <div class="ex-head">
        {ex.slot && <span class="slot">{ex.slot}</span>}
        <div>
          <h3>{ex.name}</h3>
          <span class="target">{targetText(ex)}</span>
        </div>
      </div>
      {last && (
        <p class="last">
          <span>Last time · {formatShort(last.date)}</span>
          <strong>{last.sets.map((s) => fmtSet(s, ex)).join(' · ')}</strong>
        </p>
      )}
      {increase && <p class="increase"><Icon name="up" size={16} /> Increase weight: you hit the top of the range on every set</p>}
      <div class={`sets ${ex.load ? 'with-load' : ''}`}>
        {Array.from({ length: ex.sets }, (_, i) => {
          const s = sets[i] || {};
          const prev = last?.sets?.[i];
          return (
            <div class="set-row">
              <span class="set-n">{ex.group === 'circuit' ? 'Round' : 'Set'} {i + 1}</span>
              {ex.load && (
                <NumberInput label={`${ex.name} set ${i + 1} weight`} value={s.kg} placeholder={prev?.kg ?? ''} suffix="kg"
                  disabled={disabled} onValue={(v) => onSet(i, 'kg', v)} />
              )}
              <NumberInput label={`${ex.name} set ${i + 1} ${unitLabel}`} value={s.reps} decimal={false}
                placeholder={prev?.reps ?? ex.max ?? ''} suffix={unitLabel} disabled={disabled} onValue={(v) => onSet(i, 'reps', v)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimerPanel({ t, isCircuit, rounds }) {
  const elapsed = timer.sessionElapsed();
  const restLeft = timer.restLeft();
  const iv = timer.intervalInfo();
  return (
    <section class="timer-panel" aria-label="Timers">
      <div class="timer-row">
        <div class="clock">
          <span class="clock-label">Session</span>
          <span class="clock-time" aria-live="off">{timer.formatClock(elapsed)}</span>
        </div>
        <div class="timer-btns">
          {t.sessionStart
            ? <button type="button" class="icon-btn solid" aria-label="Pause session timer" onClick={timer.pauseSession}><Icon name="pause" /></button>
            : <button type="button" class="icon-btn solid" aria-label="Start session timer" onClick={timer.startSession}><Icon name="play" /></button>}
          <button type="button" class="icon-btn" aria-label="Reset session timer" disabled={!elapsed} onClick={timer.resetSession}><Icon name="reset" /></button>
        </div>
      </div>

      {isCircuit ? (
        iv && !iv.finished ? (
          <div class={`interval ${iv.phase.kind}`}>
            <div>
              <span class="clock-label">Round {iv.phase.round}/{rounds} · {iv.phase.kind === 'work' ? 'Work' : 'Rest'}</span>
              <strong class="interval-move">{iv.phase.label}</strong>
              {iv.next && <span class="muted small">Next: {iv.next.kind === 'rest' ? 'rest' : iv.next.label}</span>}
            </div>
            <span class="interval-time">{Math.ceil(iv.left)}</span>
            <button type="button" class="btn small ghost" onClick={timer.stopInterval}>Stop</button>
          </div>
        ) : (
          <button type="button" class="btn secondary block" onClick={() => timer.startInterval(circuitPhases(rounds))}>
            Start interval timer · {CIRCUIT_WORK}/{CIRCUIT_REST} × {rounds} rounds
          </button>
        )
      ) : t.rest ? (
        <div class="rest-active">
          <span class="clock-label">Rest</span>
          <span class="rest-time">{timer.formatClock(restLeft)}</span>
          <div class="rest-bar"><span style={{ width: `${(restLeft / (t.rest.secs * 1000)) * 100}%` }} /></div>
          <button type="button" class="btn small ghost" onClick={timer.cancelRest}>Skip</button>
        </div>
      ) : (
        <button type="button" class="btn secondary block" onClick={() => timer.startRest(REST_SECONDS)}>Rest {REST_SECONDS} s</button>
      )}
    </section>
  );
}
