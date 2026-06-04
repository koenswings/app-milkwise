# Pre-built Dockerfile — Next.js is built on the host (Pi), only the standalone output is copied.
# This avoids OOM during npm install + next build inside Docker on ARM.
# Build context: the baby-milk-tracker project root (must have .next/standalone ready)

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy the pre-built standalone server and static assets
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

# Data directory for feeds.json
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3333
ENV PORT=3333
ENV DATA_DIR=/app/data
CMD ["node", "server.js"]
