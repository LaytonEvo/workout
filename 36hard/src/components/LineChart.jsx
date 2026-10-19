import { useState } from 'preact/hooks';
import { diffDays, END, formatShort, formatUK, START } from '../lib/dates.js';

const W = 340;
const H = 170;
const PAD = { l: 56, r: 16, t: 26, b: 26 };

/**
 * Single-series line over the challenge timeline (x is true-to-date).
 * points: [{ key, value }], value in display units; format(v) -> label.
 */
export function LineChart({ points, format, label }) {
  const [sel, setSel] = useState(points.length - 1);
  if (points.length === 0) return <p class="empty">No check-ins yet.</p>;

  const span = diffDays(START, END);
  const x = (k) => PAD.l + (diffDays(START, k) / span) * (W - PAD.l - PAD.r);
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.25, Math.abs(hi) * 0.01, 0.5);
  lo -= pad;
  hi += pad;
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const xTicks = [START, '2026-11-16', END];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.key).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const active = points[Math.min(sel, points.length - 1)];

  return (
    <figure class="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${points.map((p) => `${formatUK(p.key)} ${format(p.value)}`).join(', ')}`}>
        {ticks.map((t) => (
          <g>
            <line class="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text class="axis" x={PAD.l - 8} y={y(t) + 4} text-anchor="end">{format(t, true)}</text>
          </g>
        ))}
        {xTicks.map((k) => (
          <text class="axis" x={x(k)} y={H - 6} text-anchor={k === START ? 'start' : k === END ? 'end' : 'middle'}>
            {formatShort(k).slice(4)}
          </text>
        ))}
        <line class="crosshair" x1={x(active.key)} x2={x(active.key)} y1={PAD.t - 6} y2={H - PAD.b} />
        <path class="line" d={path} />
        {points.map((p, i) => (
          <g class={`pt ${p === active ? 'on' : ''}`}>
            <circle class="dot" cx={x(p.key)} cy={y(p.value)} r={p === active ? 5.5 : 4} />
            <circle class="hit" cx={x(p.key)} cy={y(p.value)} r="18" onClick={() => setSel(i)} onPointerEnter={() => setSel(i)}>
              <title>{`${formatUK(p.key)}: ${format(p.value)}`}</title>
            </circle>
          </g>
        ))}
        <text class="value-label" x={Math.min(Math.max(x(active.key), PAD.l + 40), W - PAD.r - 40)} y={14} text-anchor="middle">
          {format(active.value)} · {formatShort(active.key)}
        </text>
      </svg>
    </figure>
  );
}
