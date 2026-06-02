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
