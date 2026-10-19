// Body measurements are stored in kg and cm; these convert for display/input.

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

const round = (n, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export const stLbToKg = (st, lb) => ((Number(st) || 0) * 14 + (Number(lb) || 0)) * KG_PER_LB;

export function kgToStLb(kg) {
  const totalLb = round(kg / KG_PER_LB, 1);
  let st = Math.floor(totalLb / 14);
  let lb = round(totalLb - st * 14, 1);
  if (lb >= 14) { st += 1; lb = round(lb - 14, 1); }
  return { st, lb };
}

export const inToCm = (inches) => Number(inches) * CM_PER_IN;
export const cmToIn = (cm) => cm / CM_PER_IN;

export function formatWeight(kg, unit) {
  if (kg == null) return '–';
  if (unit === 'st') {
    const { st, lb } = kgToStLb(kg);
    return `${st} st ${lb} lb`;
  }
  return `${round(kg).toFixed(1)} kg`;
}

/** Value in the display unit (st shown as total stone, for charting). */
export const weightValue = (kg, unit) => (unit === 'st' ? kg / KG_PER_LB / 14 : kg);

export function formatWeightDelta(kgDelta, unit) {
  const sign = kgDelta > 0 ? '+' : kgDelta < 0 ? '−' : '±';
  const abs = Math.abs(kgDelta);
  return unit === 'st'
    ? `${sign}${round(abs / KG_PER_LB).toFixed(1)} lb`
    : `${sign}${round(abs).toFixed(1)} kg`;
}

export function formatWaist(cm, unit) {
  if (cm == null) return '–';
  return unit === 'in' ? `${round(cmToIn(cm)).toFixed(1)} in` : `${round(cm).toFixed(1)} cm`;
}

export const waistValue = (cm, unit) => (unit === 'in' ? cmToIn(cm) : cm);

export function formatWaistDelta(cmDelta, unit) {
  const sign = cmDelta > 0 ? '+' : cmDelta < 0 ? '−' : '±';
  const v = unit === 'in' ? cmToIn(Math.abs(cmDelta)) : Math.abs(cmDelta);
  return `${sign}${round(v).toFixed(1)} ${unit === 'in' ? 'in' : 'cm'}`;
}
