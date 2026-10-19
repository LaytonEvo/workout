import { formatUK, START, END } from '../lib/dates.js';

const RULES = [
  {
    n: 1, title: 'No alcohol', kind: 'Strict · daily',
    why: 'Alcohol adds empty calories, wrecks sleep quality and lowers next-day willpower. It is also the habit most likely to knock the others over.',
  },
  {
    n: 2, title: 'Stick to the diet and log all food', kind: 'Strict · daily',
    why: 'Belly fat comes off in a calorie deficit. Logging everything is how you know you are actually in one, rather than guessing.',
  },
  {
    n: 3, title: "Plan tomorrow's food", kind: 'Strict · daily',
    why: 'Most diet slips happen when you are hungry with nothing ready. Deciding the night before takes the decision out of the moment.',
  },
  {
    n: 4, title: 'Drink 3 litres of water', kind: 'Strict · daily',
    why: 'Helps appetite control, training performance and recovery, and makes it easier to tell hunger from thirst.',
  },
  {
    n: 5, title: 'Daily cardio: 10,000 steps or a 30-minute Watt bike session', kind: 'Strict · daily',
    why: 'Low-intensity daily movement burns fat without eating into recovery from lifting. It is separate from the strength workout. Aim for 3 sessions a week outdoors: daylight helps sleep and mood (not strict).',
  },
  {
    n: 6, title: 'Strength workout: 30 minutes, or the 15-minute crunch-day circuit', kind: 'Weekly · 5 per Monday–Sunday week',
    why: 'Lifting keeps your muscle while you are in a deficit, so the weight you lose is fat. Core work builds the strength the goal asks for. Five a week leaves room for one busy day without breaking the rule.',
  },
  {
    n: 7, title: 'Take a daily progress photo', kind: 'Strict · daily',
    why: 'The scales move slowly and lie day to day. Photos show the change you cannot see in the mirror. Tick only: photos stay in your camera roll.',
  },
];

export function Rules() {
  return (
    <>
      <header class="page-head">
        <span class="eyebrow"><a href="#/settings">Settings</a> · Reference</span>
        <h1>The rules</h1>
        <p class="muted">36 days, {formatUK(START)} to {formatUK(END)}. Get habits back on track, lose belly fat, build core strength, keep muscle.</p>
      </header>
      <ol class="rule-ref">
        {RULES.map((r) => (
          <li>
            <span class="rule-n">{r.n}</span>
            <div>
              <h2>{r.title}</h2>
              <span class="kind">{r.kind}</span>
              <p>{r.why}</p>
            </div>
          </li>
        ))}
      </ol>
      <section class="section">
        <h2 class="group-title">How passing works</h2>
        <ul class="plain">
          <li>A day <strong>passes</strong> when rules 1, 2, 3, 4, 5 and 7 are all ticked.</li>
          <li>Rule 6 is judged weekly: 5 strength sessions in each Monday–Sunday week. The final week is 30 Nov–6 Dec. Day 36 (Mon 7 Dec) counts towards no week.</li>
          <li>A day still incomplete when it ends is <strong>missed</strong>. One missed day, or a week under 5 sessions, and the challenge shows as failed, with the day it broke. Keep tracking anyway.</li>
          <li>No restarts. The end date is fixed.</li>
          <li>Today and yesterday can be edited freely. Older days ask you to confirm first.</li>
        </ul>
      </section>
    </>
  );
}
