import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ConfirmDialog, Icon, Toast } from './components/ui.jsx';
import { editAccess, formatUK, formatShort, toKey } from './lib/dates.js';
import { buildSampleData, SAMPLE_DB, SAMPLE_TODAY } from './lib/sample.js';
import { createStorage, emptyData, requestPersistence } from './lib/storage.js';
import { DEFAULT_SETTINGS, StoreContext, navigate, readSampleFlag, writeSampleFlag } from './store.js';
import { Calendar } from './screens/Calendar.jsx';
import { Progress } from './screens/Progress.jsx';
import { Rules } from './screens/Rules.jsx';
import { Settings } from './screens/Settings.jsx';
import { Today } from './screens/Today.jsx';
import { Workout } from './screens/Workout.jsx';

const TABS = [
  { name: 'today', label: 'Today', icon: 'today' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'workout', label: 'Workout', icon: 'workout' },
  { name: 'progress', label: 'Progress', icon: 'progress' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

function parseRoute() {
  const [name = 'today', param = null] = location.hash.replace(/^#\/?/, '').split('/');
  const known = [...TABS.map((t) => t.name), 'rules'];
  return { name: known.includes(name) ? name : 'today', param };
}

const realToday = () => toKey(new Date());

export function App({ updateSW }) {
  const [sample, setSample] = useState(readSampleFlag);
  const storage = useMemo(() => createStorage(sample ? SAMPLE_DB : '36hard'), [sample]);
  const [data, setData] = useState(null);
  const [today, setToday] = useState(() => (sample ? SAMPLE_TODAY : realToday()));
  const [route, setRoute] = useState(parseRoute);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [unlocked, setUnlocked] = useState(() => new Set());
  const dataRef = useRef(data);

  // Load (or reload when switching between real and sample data).
  useEffect(() => {
    let live = true;
    setData(null);
    storage.loadAll().then((d) => { if (live) { dataRef.current = d; setData(d); } }).catch((err) => {
      console.error(err);
      if (live) {
        dataRef.current = emptyData();
        setData(dataRef.current);
        setToast({ text: "Couldn't open saved data. Changes may not be kept.", sticky: true });
      }
    });
    if (!sample) requestPersistence();
    setToday(sample ? SAMPLE_TODAY : realToday());
    setUnlocked(new Set());
    return () => { live = false; };
  }, [storage]);

  // Roll over at midnight; also when the app comes back to the foreground.
  useEffect(() => {
    if (sample) return undefined;
    const check = () => setToday((t) => (t === realToday() ? t : realToday()));
    const id = setInterval(check, 30000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', check); };
  }, [sample]);

  useEffect(() => {
    const onHash = () => { setRoute(parseRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!updateSW) return;
    updateSW.onNeedRefresh = () => setToast({
      text: 'A new version is ready.', sticky: true,
      action: { label: 'Reload', run: () => updateSW.apply() },
    });
    updateSW.onOfflineReady = () => setToast({ text: 'Ready to work offline.' });
  }, [updateSW]);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    setDialog({ ...opts, onResult: (ok) => { setDialog(null); resolve(ok); } });
  }), []);

  const persist = (promise) => promise.catch((err) => {
    console.error(err);
    setToast({ text: "Couldn't save that change.", sticky: false });
  });

  // Apply a change synchronously to the ref too, so rapid taps never read stale state.
  const commit = (fn) => {
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
    return next;
  };

  const actions = useMemo(() => ({
    updateDay(key, patch) {
      const next = commit((d) => ({ ...d, days: { ...d.days, [key]: { ...(d.days[key] || {}), ...patch } } }));
      persist(storage.put('days', key, next.days[key]));
    },
    saveWorkout(key, workout) {
      commit((d) => ({ ...d, workouts: { ...d.workouts, [key]: workout } }));
      persist(storage.put('workouts', key, workout));
    },
    deleteWorkout(key) {
      commit((d) => {
        const workouts = { ...d.workouts };
        delete workouts[key];
        return { ...d, workouts };
      });
      persist(storage.remove('workouts', key));
    },
    saveCheckin(key, rec) {
      commit((d) => ({ ...d, checkins: { ...d.checkins, [key]: rec } }));
      persist(storage.put('checkins', key, rec));
    },
    updateSettings(patch) {
      const next = commit((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
      persist(storage.putSettings(next.settings));
    },
    async replaceAll(next) {
      await storage.replaceAll(next);
      commit(() => ({ ...emptyData(), ...next }));
    },
    async resetAll() {
      await storage.clear();
      commit(() => emptyData());
    },
    async enterSample() {
      const s = createStorage(SAMPLE_DB);
      await s.replaceAll(buildSampleData());
      await s.close();
      writeSampleFlag(true);
      setSample(true);
      navigate('/today');
      setToast({ text: `Sample data loaded. Previewing ${formatShort(SAMPLE_TODAY)}.` });
    },
    async exitSample() {
      await storage.destroy().catch(() => {});
      writeSampleFlag(false);
      setSample(false);
      navigate('/today');
      setToast({ text: 'Sample data wiped. Back to your real data.' });
    },
    /** Resolve true if `key` may be edited now, asking first for older days. */
    async requestEdit(key) {
      const access = editAccess(key, today);
      if (access === 'free' || unlocked.has(key)) return true;
      if (access === 'locked') return false;
      const ok = await confirm({
        title: `Edit ${formatShort(key)}?`,
        body: 'This day is more than a day old. Changing it can change your challenge status.',
        confirmLabel: 'Edit this day',
      });
      if (ok) setUnlocked((u) => new Set(u).add(key));
      return ok;
    },
    canEdit: (key) => editAccess(key, today) === 'free' || unlocked.has(key),
    confirm,
    toast: (text) => setToast({ text }),
  }), [storage, today, unlocked, confirm]);

  if (!data) return <div class="boot" aria-busy="true"><span class="boot-mark">36</span></div>;

  const settings = { ...DEFAULT_SETTINGS, ...data.settings };
  const store = { data, settings, today, sample, actions, route };
  const Screen = { today: Today, calendar: Calendar, workout: Workout, progress: Progress, rules: Rules, settings: Settings }[route.name];
  const activeTab = route.name === 'rules' ? 'settings' : route.name;

  return (
    <StoreContext.Provider value={store}>
      {sample && (
        <div class="sample-bar" role="note">
          <span>Sample data · preview {formatUK(SAMPLE_TODAY)}</span>
          <button type="button" class="btn small" onClick={actions.exitSample}>Wipe sample data</button>
        </div>
      )}
      <main class="screen" key={route.name + (route.param || '')}>
        <Screen param={route.param} />
      </main>
      <nav class="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <a href={`#/${t.name}`} class={activeTab === t.name ? 'active' : ''} aria-current={activeTab === t.name ? 'page' : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
      {dialog && <ConfirmDialog {...dialog} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </StoreContext.Provider>
  );
}
