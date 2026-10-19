// Export / import as a single JSON file.

import { isKey } from './dates.js';
import { COLLECTIONS } from './storage.js';

export const APP_ID = '36-hard';
export const SCHEMA_VERSION = 1;

export function buildExport(data, now = new Date()) {
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      settings: data.settings || {},
      days: data.days || {},
      workouts: data.workouts || {},
      checkins: data.checkins || {},
    },
  };
}

export const exportFilename = (todayKey) => `36-hard-backup-${todayKey}.json`;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Parse and validate a backup file. Throws an Error with a readable message. */
export function parseImport(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isPlainObject(json) || json.app !== APP_ID) {
    throw new Error("That doesn't look like a 36 Hard backup.");
  }
  if (typeof json.schemaVersion !== 'number' || json.schemaVersion > SCHEMA_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  const d = json.data;
  if (!isPlainObject(d)) throw new Error('The backup has no data section.');
  const out = { settings: isPlainObject(d.settings) ? d.settings : {} };
  for (const c of COLLECTIONS) {
    const v = d[c] ?? {};
    if (!isPlainObject(v)) throw new Error(`The “${c}” section is malformed.`);
    for (const [k, rec] of Object.entries(v)) {
      if (!isPlainObject(rec)) throw new Error(`A record in “${c}” is malformed.`);
      if ((c === 'days' || c === 'checkins') && !isKey(k)) throw new Error(`“${k}” isn't a valid date.`);
    }
    out[c] = v;
  }
  return out;
}

export function summarise(data) {
  return {
    days: Object.keys(data.days).length,
    workouts: Object.keys(data.workouts).length,
    checkins: Object.keys(data.checkins).length,
  };
}
