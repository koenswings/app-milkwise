#!/usr/bin/env bash
# Build the MilkWise web image from koenswings/baby-milk-tracker at a pinned commit.
# Run on an arm64 Pi (claimed pool Pi). It builds and tags locally only: it does
# NOT push (publishing to Docker Hub / ghcr needs Koen's OK).
#
#   scripts/build-image.sh                 # 715734b -> koenswings/milkwise:1.1.58
#   UPSTREAM_COMMIT=<sha> scripts/build-image.sh
set -euo pipefail

UPSTREAM_REPO="${UPSTREAM_REPO:-https://github.com/koenswings/baby-milk-tracker.git}"
UPSTREAM_COMMIT="${UPSTREAM_COMMIT:-715734bf6a70c651dbe0dc5482f15fc6fda3fa7d}"
EXPECT_VERSION="${EXPECT_VERSION:-1.1.58}"
IMAGE="${IMAGE:-koenswings/milkwise}"

here="$(cd "$(dirname "$0")/.." && pwd)"
arch="$(uname -m)"
if [ "$arch" != "aarch64" ] && [ "$arch" != "arm64" ]; then
  echo "build-image: run this on an arm64 Pi (this host is $arch)" >&2
  exit 1
fi

work="$(mktemp -d "${TMPDIR:-/tmp}/milkwise-build.XXXXXX")"
echo "build-image: work dir $work (left in place; quarantine it when done)"
git clone --quiet "$UPSTREAM_REPO" "$work/src"
git -C "$work/src" checkout --quiet --detach "$UPSTREAM_COMMIT"

version="$(node -p "require('$work/src/package.json').version")"
if [ "$version" != "$EXPECT_VERSION" ]; then
  echo "build-image: upstream $UPSTREAM_COMMIT is $version, expected $EXPECT_VERSION" >&2
  exit 1
fi
test -f "$work/src/src/lib/atomic-write.ts" || { echo "build-image: no atomic-write.ts at $UPSTREAM_COMMIT" >&2; exit 1; }

cp "$here/app/Dockerfile" "$work/src/Dockerfile"
( cd "$work/src" && npm ci && npm test -- --ci && npm run build )

docker build \
  --label "org.opencontainers.image.source=https://github.com/koenswings/baby-milk-tracker" \
  --label "org.opencontainers.image.revision=$UPSTREAM_COMMIT" \
  --label "org.opencontainers.image.version=$version" \
  -t "$IMAGE:$version" "$work/src"

docker image inspect "$IMAGE:$version" --format 'build-image: {{.Id}} {{.Architecture}} {{index .Config.Labels "org.opencontainers.image.revision"}}'
