# app-milkwise

IDEA App Disk for MilkWise — a precision bottle-feeding tracker for parents.

## What it does

MilkWise tracks bottle feeds and calculates two key metrics:

- **Strict 24h** — total volume consumed in the last 24 hours
- **Smoothed Effective** — a weighted metric that gives full credit to recent feeds and gradually reduces credit for older ones, producing a stable picture of daily intake

Daily targets, hourly rate, and ideal feed intervals are all calculated from the baby's current weight.

## Structure

```
compose.yaml       # App Disk manifest + Docker Compose
app.yaml           # Build approach, upstream monitors, Engine compatibility (engine_tested set by the App Harness)
icon.png           # App icon
app/               # Next.js application source
  Dockerfile       # ARM-compatible production build
  src/             # Application code
data/              # Runtime data (feeds.json, settings.json) — gitignored
```

## Building the image

```bash
# Build ARM image on Pi
docker build -t koenswings/milkwise:1.0.0 ./app

# Push to DockerHub
docker push koenswings/milkwise:1.0.0
```

## Running standalone (development)

```bash
cd app
npm install
npm run dev
```

## Data persistence

Feed and settings data is stored in `./data/` as JSON files. Mount this directory as a volume to persist data across container restarts.

## Release check against the previous release (idea#403)

`AAD_CHECK_COMPOSE=<agent-app-dev>/script/check-compose.mjs script/check-base-ref.sh` compares `compose.yaml` with the previous release tag (agent-app-dev `check-compose --base-ref`): a stateful image (MariaDB, MySQL, Postgres, Mongo, Redis) that moves to a new series needs an App major bump. The previous release tag is the highest `<major>.<minor>[-<upstream>]` tag that is an ancestor of HEAD and not HEAD's own tag; a first release is skipped with a note. It needs tags and full history (CI: `fetch-depth: 0`); a shallow clone fails.
