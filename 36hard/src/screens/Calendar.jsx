import { useState } from 'preact/hooks';
import { DayEditor } from '../components/DayEditor.jsx';
import { Icon, Sheet } from '../components/ui.jsx';
import {
  WEEKS, WEEK_TARGET, addDays, checkinLabel, dayNumber, END, formatLong, formatUK, isCheckinDay, TOTAL_DAYS,
} from '../lib/dates.js';
import { sessionLabel } from '../lib/plan.js';
import { challengeStatus, dayState, describeBreak, weekState } from '../lib/rules.js';
import { formatWaist, formatWeight } from '../lib/units.js';
import { useStore } from '../store.js';

const HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STATE_LABEL = { passed: 'Passed', missed: 'Missed', pending: 'Today, in progress', future: 'Future' };

export function Calendar() {
  const { data, today } = useStore();
  const [open, setOpen] = useState(null);
  const status = challengeStatus(data.days, today);
  const rows = [...WEEKS.map((w) => ({ week: w, keys: Array.from({ length: 7 }, (_, i) => addDays(w.start, i)) })),
    { week: null, keys: [END] }];

  return (
    <>
      <header class="page-head">
        <span class="eyebrow">History</span>
        <h1>{status.daysPassed} of {TOTAL_DAYS} passed</h1>
        {status.failed
          ? <p class="status-line failed">Failed on day {status.brokeOn.day}: {describeBreak(status.brokeOn)}</p>
          : <p class="status-line ok">{status.phase === 'before' ? 'Starts Monday 2 November' : 'On track'}</p>}
      </header>

      <div class="cal" role="grid" aria-label="Challenge calendar">
        <div class="cal-row cal-head" role="row">
          {HEAD.map((h) => <span role="columnheader">{h}</span>)}
          <span role="columnheader" class="cal-wk">Str</span>
        </div>
        {rows.map(({ week, keys }) => {
          const ws = week && weekState(week, data.days, today);
          return (
            <div class="cal-row" role="row">
              {keys.map((k) => {
                const st = dayState(k, data.days, today);
                return (
                  <button type="button" role="gridcell" class={`cal-cell ${st} ${k === today ? 'is-today' : ''}`}
                    aria-label={`Day ${dayNumber(k)}, ${formatUK(k)}: ${STATE_LABEL[st]}`} onClick={() => setOpen(k)}>
                    <span class="cal-n">{dayNumber(k)}</span>
                    <span class="cal-d">{Number(k.slice(8))}/{Number(k.slice(5, 7))}</span>
                    {data.days[k]?.strength?.done && <span class="cal-dot" aria-hidden="true" />}
                  </button>
                );
              })}
              {week ? (
                <span class={`cal-wk ${ws.state}`} title={`Week ${week.number} strength`}>{ws.count}/{WEEK_TARGET}</span>
              ) : (
                <span class="cal-final">Day 36 · final day, no weekly target</span>
              )}
            </div>
          );
        })}
      </div>

      <ul class="legend" aria-label="Key">
        <li><span class="sw passed" />Passed</li>
        <li><span class="sw missed" />Missed</li>
        <li><span class="sw is-today" />Today</li>
        <li><span class="sw future" />Future</li>
        <li><span class="sw dot" />Strength session</li>
      </ul>

      {open && (
        <Sheet title={`Day ${dayNumber(open)} · ${formatLong(open)}`} onClose={() => setOpen(null)}>
          <DayDetail dayKey={open} />
        </Sheet>
      )}
    </>
  );
}

function DayDetail({ dayKey }) {
  const { data, settings, today } = useStore();
  const st = dayState(dayKey, data.days, today);
  const w = data.workouts[dayKey];
  const c = data.checkins[dayKey];
  return (
    <div class="stack">
      <p class={`pill ${st}`}>{STATE_LABEL[st]} · {formatUK(dayKey)}</p>
      <DayEditor dayKey={dayKey} compact />
      {(w || dayKey <= today) && (
        <a class="list-link" href={`#/workout/${dayKey}`}>
          <span>{w ? `Workout log: ${sessionLabel(w.session, w.mode)}${w.completedAt ? ' ✓' : ''}` : 'Log a workout for this day'}</span>
          <Icon name="chevron" />
        </a>
      )}
      {isCheckinDay(dayKey) && (
        <div class="card">
          <span class="eyebrow">{checkinLabel(dayKey)}</span>
          {c ? (
            <p>{formatWeight(c.weightKg, settings.weightUnit)} · waist {formatWaist(c.waistCm, settings.waistUnit)}{c.note ? ` · “${c.note}”` : ''}</p>
          ) : <p class="muted">Not done yet. Add it from the Progress screen.</p>}
        </div>
      )}
    </div>
  );
}
