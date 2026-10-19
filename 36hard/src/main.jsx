import '@fontsource/anton/latin-400.css';
import '@fontsource-variable/inter/wght.css';
import './styles.css';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app.jsx';

// Bridges service-worker events into the app's toast.
const updateSW = { onNeedRefresh: null, onOfflineReady: null, apply: () => {} };
const apply = registerSW({
  onNeedRefresh: () => updateSW.onNeedRefresh?.(),
  onOfflineReady: () => updateSW.onOfflineReady?.(),
});
updateSW.apply = () => apply(true);

render(<App updateSW={updateSW} />, document.getElementById('app'));
