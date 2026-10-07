# syntax=docker/dockerfile:1

# No secrets enter any stage. Runtime config comes from NUXT_* variables at
# `docker run` time, and .dockerignore keeps .env out of the context.

# Matches Volta's pin in package.json. pnpm lint checks it, and the build
# script passes Volta's value in.
ARG NODE_VERSION=24.21.0

# Every workspace manifest, so each install matches the lockfile exactly.
FROM scratch AS manifests
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/oidc/package.json packages/oidc/
COPY packages/json-store/package.json packages/json-store/
COPY packages/nuxt-shell/package.json packages/nuxt-shell/
COPY packages/nuxt-platform/package.json packages/nuxt-platform/
COPY packages/nuxt-passwords/package.json packages/nuxt-passwords/
COPY packages/nuxt-media/package.json packages/nuxt-media/
COPY packages/nuxt-feedback/package.json packages/nuxt-feedback/
COPY packages/editor/package.json packages/editor/
COPY packages/sandbox/package.json packages/sandbox/
COPY sandbox/package.json sandbox/

# The packages for the image's platform, which the tools run on: drizzle-kit
# and tsx carry platform-specific binaries.
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
RUN corepack enable
COPY --from=manifests /app ./
# postinstall runs `nuxt prepare`, which needs the sources copied below.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# The same packages for the machine doing the build. The app's build output is
# plain JavaScript with no native code, so building it here and copying it
# into an image for another platform, such as linux/arm64, skips emulating
# the slowest step.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-slim AS build-deps
WORKDIR /app
RUN corepack enable
COPY --from=manifests /app ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM build-deps AS build
# true builds in the platform admin area. Off by default, so an image without
# it ships none of its code.
ARG NUXT_PLATFORM=false
ENV NUXT_PLATFORM=${NUXT_PLATFORM}
# What this build is, for Settings, Application. .git isn't in the context, so
# the build script passes them in.
ARG GIT_COMMIT=unknown
ARG GIT_COMMIT_DATE=
ENV GIT_COMMIT=${GIT_COMMIT} GIT_COMMIT_DATE=${GIT_COMMIT_DATE}
COPY . .
# Each layer's tsconfig points into its generated .nuxt folder, which the
# build reads, and the install above skipped generating.
RUN pnpm --filter './packages/nuxt-*' exec nuxt prepare \
 && pnpm --filter @kmjbyrne/nuxt-feedback exec nuxt prepare platform \
 && pnpm build

# Tools for deliberate, one-off operations against the database: migrations
# and the first platform admin. It does nothing unless given a command, so
# nothing migrates by accident:
#   docker run --rm -e NUXT_DATABASE_URL=... <image> drizzle-kit migrate
#   docker run --rm -e NUXT_DATABASE_URL=... <image> tsx scripts/platform-grant.ts you@example.com "Your Name"
# Binaries run directly, because `pnpm run` re-verifies node_modules and tries
# to reinstall as root.
# Built from the installed packages and the source, not the app build: these
# commands never use the built app, so a code change costs seconds, not a full
# Nuxt build.
FROM deps AS tools
COPY . .
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
