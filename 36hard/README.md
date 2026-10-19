# 36 Hard

Personal tracker for a 36-day habit and fitness challenge (Mon 2 Nov – Mon 7 Dec 2026).
Preact + Vite, installable PWA, works offline, all data stays on the device (IndexedDB).

Live at `https://<user>.github.io/workout/36hard/` once deployed.

## Develop

```sh
cd 36hard
npm install
npm run dev          # http://localhost:5173/workout/36hard/
npm test             # unit tests: dates, pass/fail rules, units, plan, backup
npm run test:e2e     # Playwright: phone + desktop, offline, PWA, export/import
npm run icons        # regenerate icons in public/icons
```

## Layout

- `src/lib/dates.js` – day numbers, Mon–Sun weeks, UK formatting, edit window
- `src/lib/rules.js` – pass / missed / failed logic (pure, derived from data)
- `src/lib/plan.js` – the strength programme and gym/home variants
- `src/lib/storage.js` – IndexedDB behind a small interface; swap this file for cloud sync
- `src/lib/backup.js` – export/import JSON
- `src/lib/sample.js` – sample data (kept in a separate database, preview date 16/11/2026)
- `src/screens/` – Today, Calendar, Workout, Progress, Rules, Settings

## Deploy

`.github/workflows/deploy.yml` builds on push to `main` and publishes the repo root
(the Training Dashboard) plus this app at `/36hard/`. In the repo's
Settings → Pages, set Source to **GitHub Actions**.
