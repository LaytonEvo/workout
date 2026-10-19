import { useEffect, useState } from 'preact/hooks';
import { CheckinForm } from '../components/CheckinForm.jsx';
import { DayEditor } from '../components/DayEditor.jsx';
import { Icon, Segmented, Sheet } from '../components/ui.jsx';
import {
  checkinLabel, dayNumber, diffDays, END, formatLong, formatUK, isCheckinDay, START, TOTAL_DAYS, weekday,
} from '../lib/dates.js';
import { scheduledSession, SESSIONS, sessionLabel } from '../lib/plan.js';
import { challengeStatus, describeBreak, isTicked, STRICT_RULES } from '../lib/rules.js';
import { useStore } from '../store.js';
import { InstallHint } from './Settings.jsx';

export function Today() {
  const { today } = useStore();
  if (today < START) return <Setup />;
  if (today > END) return <Complete />;
  return <ChallengeDay />;
}

function StatusChip({ status }) {
  return status.failed ? (
    <div class="status failed">
      <strong>Failed on day {status.brokeOn.day}</strong>
      <span>{describeBreak(status.brokeOn)}. Keep tracking: {status.daysPassed} of {TOTAL_DAYS} days passed.</span>
    </div>
  ) : (
    <div class="status ok">
      <strong>On track</strong>
      <span>{status.daysPassed} of {TOTAL_DAYS} days passed{status.streak > 1 ? ` · ${status.streak}-day streak` : ''}</span>
    </div>
  );
}

function ChallengeDay() {
  const { data, today } = useStore();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const status = challengeStatus(data.days, today);
  const day = data.days[today];
  const done = STRICT_RULES.filter((r) => isTicked(day, r.id)).length;
  const n = dayNumber(today);
  const checkinDue = isCheckinDay(today) && !data.checkins[today];

  return (
    <>
      <header class="hero">
        <div class="hero-top">
          <span class="eyebrow">36 Hard · {formatUK(today)}</span>
          <a href="#/rules" class="hero-link"><Icon name="rules" size={18} /> Rules</a>
        </div>
        <h1 class="daycount" aria-label={`Day ${n} of ${TOTAL_DAYS}`}>
          <span class="daycount-word">Day</span>
          <span class="daycount-n">{n}</span>
          <span class="daycount-of">of {TOTAL_DAYS}</span>
        </h1>
        <p class="hero-date">{formatLong(today)}</p>
        <StatusChip status={status} />
        <div class="meter" role="img" aria-label={`${done} of ${STRICT_RULES.length} daily rules done`}>
          {STRICT_RULES.map((r, i) => <span class={i < done ? 'on' : ''} />)}
        </div>
      </header>

      {checkinDue && (
        <button type="button" class="banner" onClick={() => setCheckinOpen(true)}>
          <Icon name="scale" />
          <span>
            <strong>{checkinLabel(today)} due</strong>
            <span>Weigh in and measure your waist before breakfast.</span>
          </span>
          <Icon name="chevron" />
        </button>
      )}

      <section class="section">
        <div class="section-head">
          <h2>Today's rules</h2>
          <span class="count">{done}/{STRICT_RULES.length}</span>
        </div>
        <DayEditor dayKey={today} />
      </section>

      <WorkoutCard dayKey={today} />

      {checkinOpen && (
        <Sheet title={checkinLabel(today)} onClose={() => setCheckinOpen(false)}>
          <CheckinForm dayKey={today} onSaved={() => setCheckinOpen(false)} />
        </Sheet>
      )}
    </>
  );
}

function WorkoutCard({ dayKey }) {
  const { data, settings, actions } = useStore();
  const logged = data.workouts[dayKey];
  const scheduled = scheduledSession(weekday(dayKey));
  const sessionKey = logged?.session || scheduled;
  const mode = logged?.mode || settings.location;
  const s = SESSIONS[sessionKey];
  const doneToday = isTicked(data.days[dayKey], 'strength');

  return (
    <section class="section">
      <div class="section-head"><h2>Today's workout</h2></div>
      <div class={`card workout-card ${doneToday ? 'is-done' : ''}`}>
        {sessionKey ? (
          <>
            <span class="eyebrow">{mode === 'crunch' ? 'Crunch day' : s.focus}</span>
            <h3 class="card-title">{sessionLabel(sessionKey, mode)}</h3>
            <p class="muted">5 min warm-up · 20 min {s.format === 'circuit' || mode === 'crunch' ? 'circuit' : 'supersets'} · 5 min core</p>
          </>
        ) : (
          <>
            <span class="eyebrow">Weekend</span>
            <h3 class="card-title">No scheduled session</h3>
            <p class="muted">Behind on the week? Choose any session to do today.</p>
          </>
        )}
        {mode !== 'crunch' && sessionKey && (
          <Segmented label="Location" value={mode} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]}
            onChange={(v) => (logged ? actions.saveWorkout(dayKey, { ...logged, mode: v }) : actions.updateSettings({ location: v }))} />
        )}
        <div class="card-actions">
          <a class="btn primary" href="#/workout">
            {doneToday ? 'View session' : sessionKey ? (logged ? 'Continue workout' : 'Start workout') : 'Choose session'}
          </a>
          {!doneToday && <a class="btn ghost" href="#/workout/crunch">Crunch day</a>}
        </div>
        {doneToday && <p class="done-note"><Icon name="check" size={18} /> Strength session done</p>}
      </div>
    </section>
  );
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [y, m, d] = target.split('-').map(Number);
  const ms = Math.max(0, new Date(y, m - 1, d).getTime() - now);
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000) % 24,
    mins: Math.floor(ms / 60000) % 60,
    secs: Math.floor(ms / 1000) % 60,
  };
}

function Setup() {
  const { data, settings, actions, today, sample } = useStore();
  const c = useCountdown(START);
  const baseline = data.checkins[START];
  const daysLeft = diffDays(today, START);

  return (
    <>
      <header class="hero">
        <div class="hero-top">
          <span class="eyebrow">36 Hard · Day 0 setup</span>
          <a href="#/rules" class="hero-link"><Icon name="rules" size={18} /> Rules</a>
        </div>
        <h1 class="daycount" aria-label={`${daysLeft} days to go`}>
          <span class="daycount-n">{daysLeft}</span>
          <span class="daycount-of">day{daysLeft === 1 ? '' : 's'} to go</span>
        </h1>
        <p class="hero-date">Day 1 is Monday 2 November · {formatUK(START)}</p>
        <div class="countdown" aria-hidden="true">
          {[['days', c.days], ['hrs', c.hours], ['min', c.mins], ['sec', c.secs]].map(([l, v]) => (
            <div><strong>{String(v).padStart(2, '0')}</strong><span>{l}</span></div>
          ))}
        </div>
      </header>

      <section class="section">
        <div class="section-head"><h2>1 · Set your units</h2></div>
        <div class="card stack">
          <div class="setting-row">
            <span>Weight</span>
            <Segmented label="Weight unit" value={settings.weightUnit} onChange={(v) => actions.updateSettings({ weightUnit: v })}
              options={[{ value: 'kg', label: 'kg' }, { value: 'st', label: 'st & lb' }]} />
          </div>
          <div class="setting-row">
            <span>Waist</span>
            <Segmented label="Waist unit" value={settings.waistUnit} onChange={(v) => actions.updateSettings({ waistUnit: v })}
              options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'inches' }]} />
          </div>
          <div class="setting-row">
            <span>Usually train at</span>
            <Segmented label="Default location" value={settings.location} onChange={(v) => actions.updateSettings({ location: v })}
              options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>2 · Baseline check-in</h2>
          {baseline && <span class="count ok"><Icon name="check" size={16} /> Saved</span>}
        </div>
        <div class="card">
          <p class="muted small">Do this on the morning of Monday 2 November, before Day 1 begins. You can enter it now and update it then.</p>
          <CheckinForm dayKey={START} key={settings.weightUnit + settings.waistUnit} />
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>3 · Get ready</h2></div>
        <div class="card stack">
          <a class="list-link" href="#/rules"><span>Read the rules and why they matter</span><Icon name="chevron" /></a>
          <a class="list-link" href="#/workout"><span>Look through the workout plan</span><Icon name="chevron" /></a>
          <InstallHint />
        </div>
      </section>

      {!sample && (
        <section class="section">
          <div class="card preview-card">
            <h3 class="card-title">See it in action</h3>
            <p class="muted">Load two weeks of sample data on a preview date. Your real data stays untouched, and one tap wipes it.</p>
            <button type="button" class="btn primary block" onClick={actions.enterSample}>Preview with sample data</button>
          </div>
        </section>
      )}
    </>
  );
}

function Complete() {
  const { data, today } = useStore();
  const status = challengeStatus(data.days, today);
  return (
    <>
      <header class="hero">
        <div class="hero-top"><span class="eyebrow">36 Hard · Finished {formatUK(END)}</span></div>
        <h1 class="daycount" aria-label={`${status.daysPassed} of ${TOTAL_DAYS} days passed`}>
          <span class="daycount-n">{status.daysPassed}</span>
          <span class="daycount-of">of {TOTAL_DAYS} days passed</span>
        </h1>
        {status.failed ? (
          <div class="status failed">
            <strong>Broke on day {status.brokeOn.day}</strong>
            <span>{describeBreak(status.brokeOn)}. You kept going anyway.</span>
          </div>
        ) : (
          <div class="status ok"><strong>Challenge complete</strong><span>Every day, every week. Done.</span></div>
        )}
      </header>
      <section class="section">
        <div class="card stack">
          <a class="list-link" href="#/progress"><span>See your progress</span><Icon name="chevron" /></a>
          <a class="list-link" href="#/calendar"><span>Look back at all 36 days</span><Icon name="chevron" /></a>
          <a class="list-link" href="#/settings"><span>Export a backup</span><Icon name="chevron" /></a>
        </div>
      </section>
    </>
  );
}
