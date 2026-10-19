import { daysInRange, editAccess, OUTDOOR_TARGET, weekOf, WEEK_TARGET } from '../lib/dates.js';
import { isTicked, outdoorCount, RULES, weekStateFor } from '../lib/rules.js';
import { useStore } from '../store.js';
import { Icon, NumberInput, Segmented, Toggle } from './ui.jsx';

function RuleTick({ rule, checked, onToggle, disabled, sub, children }) {
  return (
    <div class={`rule ${checked ? 'is-done' : ''} ${rule.strict ? '' : 'is-weekly'}`}>
      <button type="button" class="rule-hit" role="checkbox" aria-checked={checked} disabled={disabled} onClick={onToggle}>
        <span class="rule-n" aria-hidden="true">{rule.n}</span>
        <span class="rule-text">
          <span class="rule-title">{rule.title}</span>
          {sub && <span class="rule-sub">{sub}</span>}
        </span>
        <span class="tick" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
      </button>
      {children}
    </div>
  );
}

function strengthSub(ws, dayKey) {
  if (!ws) return 'Final day: counts towards no weekly target';
  const base = `${ws.count}/${WEEK_TARGET} this week`;
  if (ws.state === 'passed') return `${base} · target hit`;
  if (ws.state === 'failed') return `${base} · week missed`;
  if (ws.state === 'atRisk') return `${base} · 5 no longer possible`;
  if (ws.state === 'open') return `${base} · ${ws.needed} more in ${ws.daysLeft} day${ws.daysLeft === 1 ? '' : 's'}`;
  return base;
}

export function DayEditor({ dayKey, compact }) {
  const { data, today, actions } = useStore();
  const day = data.days[dayKey] || {};
  const access = editAccess(dayKey, today);
  const editable = actions.canEdit(dayKey);
  // Ticks on an older day ask to unlock on tap; free-text inputs wait until unlocked.
  const inputsOff = !editable;
  const cardio = day.cardio || { done: false, type: 'steps' };
  const week = weekOf(dayKey);
  const ws = weekStateFor(dayKey, data.days, today);
  const outdoors = week ? outdoorCount(data.days, daysInRange(week.start, week.end)) : null;

  const guard = async (fn) => {
    if (await actions.requestEdit(dayKey)) fn();
  };
  const toggle = (id) => guard(() => {
    if (id === 'cardio') actions.updateDay(dayKey, { cardio: { ...cardio, done: !cardio.done } });
    else if (id === 'strength') actions.updateDay(dayKey, { strength: { ...(day.strength || {}), done: !isTicked(day, 'strength') } });
    else actions.updateDay(dayKey, { [id]: !day[id] });
  });
  const setCardio = (patch) => guard(() => actions.updateDay(dayKey, { cardio: { ...cardio, ...patch } }));

  return (
    <div class={`day-editor ${compact ? 'compact' : ''}`}>
      {access === 'locked' && <p class="note"><Icon name="lock" size={16} /> Future day. You can tick it off once it arrives.</p>}
      {access === 'confirm' && !editable && (
        <button type="button" class="note note-btn" onClick={() => actions.requestEdit(dayKey)}>
          <Icon name="lock" size={16} /> Older day. Tap to unlock editing.
        </button>
      )}
      <div class="rules">
        {RULES.map((rule) => {
          if (rule.id === 'cardio') {
            return (
              <RuleTick key={rule.id} rule={rule} checked={cardio.done} disabled={access === 'locked'}
                onToggle={() => toggle('cardio')}
                sub={cardio.type === 'bike' ? '30-minute Watt bike session' : '10,000 steps'}>
                <div class="rule-extra">
                  <Segmented label="Cardio type" value={cardio.type || 'steps'} disabled={inputsOff}
                    options={[{ value: 'steps', label: '10k steps' }, { value: 'bike', label: 'Watt bike' }]}
                    onChange={(type) => setCardio({ type })} />
                  <div class="rule-extra-row">
                    {cardio.type === 'bike'
                      ? <NumberInput label="Bike minutes" value={cardio.minutes} placeholder="30" suffix="min" decimal={false}
                          disabled={inputsOff} onValue={(minutes) => setCardio({ minutes })} />
                      : <NumberInput label="Step count" value={cardio.steps} placeholder="10000" suffix="steps" decimal={false}
                          disabled={inputsOff} onValue={(steps) => setCardio({ steps })} />}
                    <Toggle label="Outdoors" checked={!!cardio.outdoors} disabled={inputsOff}
                      onChange={(v) => setCardio({ outdoors: v })} />
                  </div>
                  {outdoors != null && (
                    <p class="rule-sub">Outdoors {outdoors}/{OUTDOOR_TARGET} this week{outdoors >= OUTDOOR_TARGET ? ' · nice' : ''}</p>
                  )}
                </div>
              </RuleTick>
            );
          }
          return (
            <RuleTick key={rule.id} rule={rule} checked={isTicked(day, rule.id)} disabled={access === 'locked'}
              onToggle={() => toggle(rule.id)}
              sub={rule.id === 'strength' ? strengthSub(ws, dayKey) : rule.id === 'photo' ? 'Tick only. Photos stay in your camera roll.' : null} />
          );
        })}
      </div>
    </div>
  );
}
