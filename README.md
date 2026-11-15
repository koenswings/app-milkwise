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

- **Before tagging a release, run `script/check-base-ref.sh` in a full clone with tags, with `AAD_CHECK_COMPOSE` set:** `AAD_CHECK_COMPOSE=<agent-app-dev>/script/check-compose.mjs script/check-base-ref.sh`.
- It compares `compose.yaml` with the previous release tag (agent-app-dev `check-compose --base-ref`). A stateful image (MariaDB, MySQL, Postgres, Mongo, Redis) that moves to a new series needs an App major bump.
- **Previous release tag:** the highest `<major>.<minor>[-<upstream>]` tag that is an ancestor of HEAD and is not HEAD's own tag.
- **It fails** in a shallow clone (`git fetch --unshallow --tags`; CI: `fetch-depth: 0`) and in a clone with no release tags at all (`git fetch --tags`).
- **First release:** if the repo has release tags but none of them is an ancestor, it is skipped with a note. If there are no release tags at all, a real first release must set `CHECK_BASE_REF_FIRST_RELEASE=1`.
- `node --test tests/release-base-ref.test.mjs` tests it. The compare runs only when `AAD_CHECK_COMPOSE` is set.
