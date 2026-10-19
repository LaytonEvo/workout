import { useEffect, useRef } from 'preact/hooks';

export function Icon({ name, size = 22 }) {
  const p = ICONS[name];
  return (
    <svg class="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {p}
    </svg>
  );
}

const ICONS = {
  today: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  workout: <><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></>,
  progress: <><path d="M4 19h16" /><path d="M5 15l4.5-4.5 3.5 3L19 7" /><path d="M15 7h4v4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  rules: <><path d="M5 4h11l3 3v13H5z" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  play: <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />,
  pause: <><path d="M8 5v14M16 5v14" stroke-width="3" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" /><path d="M4 4v4.5h4.5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.8 2.5-5 .3 1.8 1.2 2.8 2.3 3.2C11 8.6 11 6 12 3z" />,
  scale: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 9.5a3.5 3.5 0 0 1 6 0M12 9.5l1.2-1.7" /></>,
  download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  upload: <><path d="M12 15V4M7 9l5-5 5 5" /><path d="M5 20h14" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
};

/** Segmented control. options: [{ value, label }] */
export function Segmented({ value, options, onChange, label, disabled }) {
  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o.value} disabled={disabled}
          class={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label class={`toggle ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span class="track" aria-hidden="true"><span class="thumb" /></span>
      <span>{label}</span>
    </label>
  );
}

/** Bottom sheet. Closes on backdrop tap or Escape. */
export function Sheet({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, []);
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div class="sheet-head">
          <h2>{title}</h2>
          <button type="button" class="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger, onResult }) {
  return (
    <div class="sheet-backdrop center" onClick={(e) => e.target === e.currentTarget && onResult(false)}>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {body && <p class="muted">{body}</p>}
        <div class="dialog-actions">
          <button type="button" class="btn ghost" onClick={() => onResult(false)}>Cancel</button>
          <button type="button" class={`btn ${danger ? 'danger' : 'primary'}`} autoFocus onClick={() => onResult(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast || toast.sticky) return undefined;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div class="toast" role="status">
      <span>{toast.text}</span>
      {toast.action && <button type="button" class="btn small primary" onClick={toast.action.run}>{toast.action.label}</button>}
    </div>
  );
}

/** Number input sized for thumbs. Calls onValue with a number or null. */
export function NumberInput({ value, onValue, placeholder, label, step = 'any', disabled, decimal = true, suffix }) {
  return (
    <label class="num">
      <span class="sr-only">{label}</span>
      <input type="number" inputMode={decimal ? 'decimal' : 'numeric'} step={step} min="0"
        value={value ?? ''} placeholder={placeholder} disabled={disabled} aria-label={label}
        onInput={(e) => {
          const v = e.currentTarget.value;
          onValue(v === '' ? null : Number(v));
        }} />
      {suffix && <span class="num-suffix" aria-hidden="true">{suffix}</span>}
    </label>
  );
}
