import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export const DEFAULT_SETTINGS = { weightUnit: 'kg', waistUnit: 'cm', location: 'gym' };

export const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const SAMPLE_FLAG = '36hard:sample-mode';

export function readSampleFlag() {
  try { return localStorage.getItem(SAMPLE_FLAG) === '1'; } catch { return false; }
}

export function writeSampleFlag(on) {
  try {
    if (on) localStorage.setItem(SAMPLE_FLAG, '1');
    else localStorage.removeItem(SAMPLE_FLAG);
  } catch { /* storage blocked */ }
}

export function navigate(path) {
  location.hash = path;
}
