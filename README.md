# app-milkwise

IDEA App Disk for MilkWise — a precision bottle-feeding tracker for parents.

Current release: **1.0** (`x-app.version` and git tag). The service image is `koenswings/milkwise:1.0.65` (the image tag is not the App version). There is no GitHub Release object; the git tag is the release.

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
  Dockerfile       # ARM64 production build
  src/             # Application code
data/              # Runtime data (feeds.json, settings.json) — gitignored
```

## Building the image

```bash
# Build on a claimed ARM64 pool Pi (never x86). Tag must match compose.yaml `image:`.
# The App version is x-app.version (currently "1.0"), not the image tag.
docker build --platform linux/arm64 -t koenswings/milkwise:1.0.65 ./app
docker manifest inspect koenswings/milkwise:1.0.65 | grep arm64
docker push koenswings/milkwise:1.0.65
```

## Running standalone (development)

```bash
cd app
npm install
npm run dev
```

## Data persistence

Feed and settings data is stored as JSON files under `./data/` on the App Disk
(`feeds.json`, `settings.json`). compose.yaml bind-mounts `./data` at `/app/data`
inside the container. App data uses this relative `./data` bind, never a Docker
named volume and never an absolute host path
([idea#141](https://github.com/koenswings/idea/issues/141)).

## Release check against the previous release (idea#403)

- **Before tagging a release, run `script/check-base-ref.sh` in a full clone with tags, with `AAD_CHECK_COMPOSE` set:** `AAD_CHECK_COMPOSE=<agent-app-dev>/script/check-compose.mjs script/check-base-ref.sh`.
- It compares `compose.yaml` with the previous release tag (agent-app-dev `check-compose --base-ref`). A stateful image (MariaDB, MySQL, Postgres, Mongo, Redis) that moves to a new series needs an App major bump.
- **Previous release tag:** the highest `<major>.<minor>[-<upstream>]` tag that is an ancestor of HEAD and is not HEAD's own tag.
- **It fails** in a shallow clone (`git fetch --unshallow --tags`; CI: `fetch-depth: 0`) and in a clone with no release tags at all (`git fetch --tags`).
- **First release:** if the repo has release tags but none of them is an ancestor, it is skipped with a note. If there are no release tags at all, a real first release must set `CHECK_BASE_REF_FIRST_RELEASE=1`.
- `node --test tests/release-base-ref.test.mjs` tests it. The compare runs only when `AAD_CHECK_COMPOSE` is set.
