# MilkWise — Web App

A precision bottle-feeding tracker built with Next.js + TypeScript. Runs on the Pi, accessible via Tailscale at `http://idea.tail2d60.ts.net:3333`.

## Development

```bash
npm run dev         # dev server on port 3333
npm run build       # production build
```

## Architecture

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Storage:** Server-side JSON file via API routes (`/api/feeds`, `/api/settings`)
- **Data file:** `data/feeds.json` — persisted on disk, backed up nightly

## Companion repos

- **React Native app:** [koenswings/milkwise-rn](https://github.com/koenswings/milkwise-rn)
- **App Disk wrapper:** [koenswings/app-milkwise](https://github.com/koenswings/app-milkwise)

## Shared Core — Sync Rule ⚠️

The following files are **shared core** between this repo and `milkwise-rn`. Any change to either file must be applied to **both repos in the same work session**:

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Shared type definitions |
| `src/lib/calculations.ts` | All business logic (smoothed formula, stats, etc.) |

`src/lib/store.ts` and all UI files are intentionally separate — the web app uses server-side API routes; the RN app uses AsyncStorage.

## UI changes — RN mirror rule ⚠️

Whenever a UI change is made to the web app, Kit will propose applying the equivalent change to the React Native app as well. The two implementations stay in sync by design.
