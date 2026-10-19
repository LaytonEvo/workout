import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, Segmented } from '../components/ui.jsx';
import { buildExport, exportFilename, parseImport, summarise } from '../lib/backup.js';
import { formatUK } from '../lib/dates.js';
import { SAMPLE_TODAY } from '../lib/sample.js';
import { useStore } from '../store.js';

let deferredPrompt = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
}

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function InstallHint() {
  const [, force] = useState(0);
  if (isStandalone()) return <p class="muted small"><Icon name="check" size={16} /> Installed on this device.</p>;
  if (deferredPrompt) {
    return (
      <button type="button" class="btn secondary block" onClick={async () => {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        force((n) => n + 1);
      }}>Install on this device</button>
    );
  }
  return (
    <p class="muted small">
      {isIOS()
        ? <>To install: open this page in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</>
        : <>To install: open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>}
    </p>
  );
}

export function Settings() {
  const { data, settings, actions, today, sample } = useStore();
  const fileRef = useRef();
  const [resetText, setResetText] = useState('');
  const [importError, setImportError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on); };
  }, []);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(buildExport(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename(today);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (file) => {
    setImportError('');
    try {
      const next = parseImport(await file.text());
      const n = summarise(next);
      const ok = await actions.confirm({
        title: 'Replace all data?',
        body: `This backup has ${n.days} days, ${n.workouts} workouts and ${n.checkins} check-ins. It will replace everything on this device${sample ? ' (sample mode)' : ''}.`,
        confirmLabel: 'Import and replace',
        danger: true,
      });
      if (!ok) return;
      await actions.replaceAll(next);
      actions.toast('Backup imported.');
    } catch (err) {
      setImportError(err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doReset = async () => {
    await actions.resetAll();
    setResetText('');
    actions.toast('All data deleted.');
  };

  return (
    <>
      <header class="page-head">
        <span class="eyebrow">Settings</span>
        <h1>Settings</h1>
      </header>

      <section class="section">
        <h2 class="group-title">Units</h2>
        <div class="card stack">
          <div class="setting-row">
            <span>Body weight</span>
            <Segmented label="Weight unit" value={settings.weightUnit} onChange={(v) => actions.updateSettings({ weightUnit: v })}
              options={[{ value: 'kg', label: 'kg' }, { value: 'st', label: 'st & lb' }]} />
          </div>
          <div class="setting-row">
            <span>Waist</span>
            <Segmented label="Waist unit" value={settings.waistUnit} onChange={(v) => actions.updateSettings({ waistUnit: v })}
              options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'inches' }]} />
          </div>
          <div class="setting-row">
            <span>Default workout</span>
            <Segmented label="Default location" value={settings.location} onChange={(v) => actions.updateSettings({ location: v })}
              options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
          </div>
          <p class="muted small">Values are stored in kg and cm, so switching units never loses precision. Lifting weights are always in kg.</p>
        </div>
      </section>

      <section class="section">
        <h2 class="group-title">Reference</h2>
        <div class="card stack">
          <a class="list-link" href="#/rules"><span>The rules and why</span><Icon name="chevron" /></a>
        </div>
      </section>

      <section class="section">
        <h2 class="group-title">Backup</h2>
        <div class="card stack">
          <p class="muted small">Everything lives on this device only. Export a backup now and then, and use it to move to a new phone.</p>
          <div class="btn-row">
            <button type="button" class="btn secondary" onClick={doExport}><Icon name="download" size={18} /> Export data</button>
            <button type="button" class="btn secondary" onClick={() => fileRef.current.click()}><Icon name="upload" size={18} /> Import data</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" class="sr-only" aria-label="Import backup file"
            data-testid="import-file" onChange={(e) => e.currentTarget.files[0] && doImport(e.currentTarget.files[0])} />
          {importError && <p class="error" role="alert">{importError}</p>}
        </div>
      </section>

      <section class="section">
        <h2 class="group-title">Sample data</h2>
        <div class="card stack">
          {sample ? (
            <>
              <p class="muted small">You're looking at sample data on a preview date of {formatUK(SAMPLE_TODAY)}. Your real data is untouched.</p>
              <button type="button" class="btn danger block" onClick={actions.exitSample}>Wipe sample data</button>
            </>
          ) : (
            <>
              <p class="muted small">Load two weeks of made-up days, workouts and check-ins to see the app working. It's kept separate from your real data.</p>
              <button type="button" class="btn secondary block" onClick={actions.enterSample}>Load sample data</button>
            </>
          )}
        </div>
      </section>

      <section class="section">
        <h2 class="group-title">Install</h2>
        <div class="card stack">
          <InstallHint />
          <p class="muted small">{online ? 'Online.' : 'Offline.'} The app works fully offline once it has loaded.</p>
        </div>
      </section>

      <section class="section">
        <h2 class="group-title">Danger zone</h2>
        <div class="card stack danger-zone">
          <p class="muted small">Delete every day, workout, check-in and setting{sample ? ' in sample mode' : ''}. This can't be undone. Type <strong>RESET</strong> to confirm.</p>
          <input type="text" class="text-input" value={resetText} autoCapitalize="characters" autoComplete="off"
            aria-label="Type RESET to confirm" placeholder="RESET" onInput={(e) => setResetText(e.currentTarget.value)} />
          <button type="button" class="btn danger block" disabled={resetText.trim() !== 'RESET'} onClick={doReset}>Reset all data</button>
        </div>
      </section>

      <p class="footnote">36 Hard · v1.0 · No sign-up, no ads, no tracking.</p>
    </>
  );
}
