# syntax=docker/dockerfile:1

# No secrets enter any stage. Runtime config comes from NUXT_* variables at
# `docker run` time, and .dockerignore keeps .env out of the context.

ARG NODE_VERSION=24.21.0

FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Every workspace manifest, so the install matches the lockfile exactly.
COPY packages/core/package.json packages/core/
COPY packages/oidc/package.json packages/oidc/
COPY packages/json-store/package.json packages/json-store/
COPY packages/nuxt-shell/package.json packages/nuxt-shell/
COPY packages/nuxt-platform/package.json packages/nuxt-platform/
COPY packages/sandbox/package.json packages/sandbox/
COPY sandbox/package.json sandbox/
# postinstall runs `nuxt prepare`, which needs the sources copied below.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
# true builds in the platform admin area. Off by default, so an image without
# it ships none of its code.
ARG NUXT_PLATFORM=false
ENV NUXT_PLATFORM=${NUXT_PLATFORM}
COPY . .
RUN pnpm build

# Tools for deliberate, one-off operations against the database: migrations
# and the first platform admin. It does nothing unless given a command, so
# nothing migrates by accident:
#   docker run --rm -e NUXT_DATABASE_URL=... <image> drizzle-kit migrate
#   docker run --rm -e NUXT_DATABASE_URL=... <image> tsx scripts/platform-grant.ts you@example.com "Your Name"
# Binaries run directly, because `pnpm run` re-verifies node_modules and tries
# to reinstall as root.
FROM build AS tools
ENV PATH=/app/node_modules/.bin:$PATH
USER node
CMD ["echo", "Give a command: drizzle-kit migrate, or tsx scripts/platform-grant.ts <email> [name]"]

FROM node:${NODE_VERSION}-slim AS app
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
