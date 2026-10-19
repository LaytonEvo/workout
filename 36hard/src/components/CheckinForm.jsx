import { useState } from 'preact/hooks';
import { checkinLabel, formatUK, START } from '../lib/dates.js';
import { cmToIn, inToCm, kgToStLb, stLbToKg } from '../lib/units.js';
import { useStore } from '../store.js';
import { NumberInput } from './ui.jsx';

const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

export const CHECKIN_REMINDER = 'Weigh in first thing in the morning, after the toilet, before food or drink. Measure your waist at the belly button.';

export function CheckinForm({ dayKey, onSaved }) {
  const { data, settings, today, actions } = useStore();
  const existing = data.checkins[dayKey];
  const stlb = existing?.weightKg != null ? kgToStLb(existing.weightKg) : null;
  const [kg, setKg] = useState(r1(existing?.weightKg));
  const [st, setSt] = useState(stlb?.st ?? null);
  const [lb, setLb] = useState(stlb?.lb ?? null);
  const [waist, setWaist] = useState(
    existing?.waistCm == null ? null : r1(settings.waistUnit === 'in' ? cmToIn(existing.waistCm) : existing.waistCm),
  );
  const [note, setNote] = useState(existing?.note || '');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const weightKg = settings.weightUnit === 'st'
      ? (st == null && lb == null ? null : stLbToKg(st, lb))
      : kg;
    const waistCm = waist == null ? null : settings.waistUnit === 'in' ? inToCm(waist) : waist;
    if (weightKg == null || waistCm == null) {
      setError('Add both your weight and waist measurement.');
      return;
    }
    // The baseline can be entered ahead of Day 1; everything else follows the edit rules.
    const early = dayKey === START && today < START;
    if (!early && !(await actions.requestEdit(dayKey))) return;
    // Keep full precision unless the value was unchanged, so re-saving never drifts.
    const keepW = existing && Math.abs(existing.weightKg - weightKg) < 0.05 ? existing.weightKg : weightKg;
    const keepC = existing && Math.abs(existing.waistCm - waistCm) < 0.05 ? existing.waistCm : waistCm;
    actions.saveCheckin(dayKey, { weightKg: keepW, waistCm: keepC, note: note.trim(), savedAt: new Date().toISOString() });
    actions.toast(`${checkinLabel(dayKey)} saved.`);
    onSaved?.();
  };

  return (
    <form class="checkin-form" onSubmit={submit}>
      <p class="reminder">{CHECKIN_REMINDER}</p>
      <div class="field">
        <span class="field-label">Weight</span>
        {settings.weightUnit === 'st' ? (
          <div class="field-row">
            <NumberInput label="Stone" value={st} onValue={setSt} suffix="st" decimal={false} />
            <NumberInput label="Pounds" value={lb} onValue={setLb} suffix="lb" />
          </div>
        ) : (
          <NumberInput label="Weight in kg" value={kg} onValue={setKg} suffix="kg" />
        )}
      </div>
      <div class="field">
        <span class="field-label">Waist at the belly button</span>
        <NumberInput label={`Waist in ${settings.waistUnit}`} value={waist} onValue={setWaist} suffix={settings.waistUnit} />
      </div>
      <label class="field">
        <span class="field-label">Note <span class="muted">(optional)</span></span>
        <textarea rows="3" value={note} placeholder="How you feel, energy, sleep"
          onInput={(e) => setNote(e.currentTarget.value)} />
      </label>
      {error && <p class="error" role="alert">{error}</p>}
      <button type="submit" class="btn primary block">Save {checkinLabel(dayKey).toLowerCase()} · {formatUK(dayKey)}</button>
    </form>
  );
}
