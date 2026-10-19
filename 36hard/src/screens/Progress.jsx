import { useState } from 'preact/hooks';
import { CheckinForm } from '../components/CheckinForm.jsx';
import { LineChart } from '../components/LineChart.jsx';
import { Icon, Sheet } from '../components/ui.jsx';
import {
  CHECKIN_DAYS, OUTDOOR_TARGET, START, TOTAL_DAYS, WEEKS, WEEK_TARGET, checkinLabel, daysInRange, formatUK,
} from '../lib/dates.js';
import { bestStreak, cardioSplit, challengeStatus, outdoorCount, weekState } from '../lib/rules.js';
import {
  formatWaist, formatWaistDelta, formatWeight, formatWeightDelta, kgToStLb, cmToIn,
} from '../lib/units.js';
import { useStore } from '../store.js';

export function Progress() {
  const { data, settings, today } = useStore();
  const [editing, setEditing] = useState(null);
  const status = challengeStatus(data.days, today);
  const best = bestStreak(data.days, today);
  const cardio = cardioSplit(data.days, today);
  const checkins = CHECKIN_DAYS.filter((k) => data.checkins[k]).map((k) => ({ key: k, ...data.checkins[k] }));
  const base = data.checkins[START];
  const latest = checkins[checkins.length - 1];
  const wu = settings.weightUnit;
  const cu = settings.waistUnit;

  const weightFmt = (kg, axis) => {
    if (!axis) return formatWeight(kg, wu);
    if (wu === 'st') { const { st, lb } = kgToStLb(kg); return `${st}st ${Math.round(lb)}`; }
    return kg.toFixed(1);
  };
  const waistFmt = (cm, axis) => (axis ? (cu === 'in' ? cmToIn(cm) : cm).toFixed(1) : formatWaist(cm, cu));
  const cardioTotal = cardio.steps + cardio.bike;

  return (
    <>
      <header class="page-head">
        <span class="eyebrow">Progress</span>
        <h1>How it's going</h1>
      </header>

      <div class="tiles">
        <div class="tile">
          <span class="tile-label">Days passed</span>
          <strong class="tile-value">{status.daysPassed}<small>/{TOTAL_DAYS}</small></strong>
        </div>
        <div class="tile">
          <span class="tile-label">Current streak</span>
          <strong class="tile-value">{status.streak}<small> day{status.streak === 1 ? '' : 's'}</small></strong>
          <span class="tile-sub">Best {best}</span>
        </div>
        <div class="tile">
          <span class="tile-label">Weight since Day 0</span>
          <strong class="tile-value delta">{base && latest && latest !== checkins[0] ? formatWeightDelta(latest.weightKg - base.weightKg, wu) : '–'}</strong>
          <span class="tile-sub">{latest ? `Now ${formatWeight(latest.weightKg, wu)}` : 'No check-ins yet'}</span>
        </div>
        <div class="tile">
          <span class="tile-label">Waist since Day 0</span>
          <strong class="tile-value delta">{base && latest && latest !== checkins[0] ? formatWaistDelta(latest.waistCm - base.waistCm, cu) : '–'}</strong>
          <span class="tile-sub">{latest ? `Now ${formatWaist(latest.waistCm, cu)}` : 'No check-ins yet'}</span>
        </div>
      </div>

      <section class="section">
        <h2 class="group-title">Weight</h2>
        <LineChart label="Weight" points={checkins.map((c) => ({ key: c.key, value: c.weightKg }))} format={weightFmt} />
      </section>
      <section class="section">
        <h2 class="group-title">Waist</h2>
        <LineChart label="Waist" points={checkins.map((c) => ({ key: c.key, value: c.waistCm }))} format={waistFmt} />
      </section>

      <section class="section">
        <h2 class="group-title">Strength sessions per week</h2>
        <div class="weeks">
          {WEEKS.map((w) => {
            const ws = weekState(w, data.days, today);
            return (
              <div class={`week-row ${ws.state}`}>
                <span class="week-label">Week {w.number}</span>
                <div class="pips" role="img" aria-label={`${ws.count} of ${WEEK_TARGET}`}>
                  {Array.from({ length: WEEK_TARGET }, (_, i) => <span class={i < ws.count ? 'on' : ''} />)}
                </div>
                <span class="week-count">{ws.count}/{WEEK_TARGET}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section class="section">
        <h2 class="group-title">Cardio</h2>
        <div class="card stack">
          <div class="split" role="img" aria-label={`Steps ${cardio.steps} days, Watt bike ${cardio.bike} days`}>
            {cardioTotal ? (
              <>
                <span class="split-a" style={{ flexGrow: cardio.steps || 0.0001 }} />
                <span class="split-b" style={{ flexGrow: cardio.bike || 0.0001 }} />
              </>
            ) : <span class="split-empty" />}
          </div>
          <div class="split-legend">
            <span><i class="sw split-a" />10k steps <strong>{cardio.steps}</strong></span>
            <span><i class="sw split-b" />Watt bike <strong>{cardio.bike}</strong></span>
            <span><Icon name="sun" size={16} />Outdoors <strong>{cardio.outdoors}</strong></span>
          </div>
          <div class="outdoor-weeks">
            {WEEKS.filter((w) => w.start <= today).map((w) => {
              const n = outdoorCount(data.days, daysInRange(w.start, w.end));
              return <span class={n >= OUTDOOR_TARGET ? 'hit' : ''}>Wk {w.number}: {n}/{OUTDOOR_TARGET}</span>;
            })}
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="group-title">Check-ins</h2>
        <div class="checkin-list">
          {CHECKIN_DAYS.map((k) => {
            const c = data.checkins[k];
            const due = k <= today || k === START;
            return (
              <button type="button" class="checkin-item" disabled={!due} onClick={() => setEditing(k)}>
                <span>
                  <strong>{checkinLabel(k)}</strong>
                  <span class="muted">{formatUK(k)}</span>
                </span>
                <span class="checkin-vals">
                  {c ? `${formatWeight(c.weightKg, wu)} · ${formatWaist(c.waistCm, cu)}` : due ? 'Add' : 'Upcoming'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {editing && (
        <Sheet title={checkinLabel(editing)} onClose={() => setEditing(null)}>
          <CheckinForm dayKey={editing} onSaved={() => setEditing(null)} />
        </Sheet>
      )}
    </>
  );
}
