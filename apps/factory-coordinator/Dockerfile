FROM node:22-alpine

# Install pnpm and tsx
RUN npm install -g pnpm@9 tsx

WORKDIR /app

# Copy monorepo root config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json* ./

# Copy all packages the coordinator depends on
COPY packages/contract-types/ ./packages/contract-types/
COPY packages/port-client/ ./packages/port-client/
COPY packages/github-client/ ./packages/github-client/
COPY packages/state-machine/ ./packages/state-machine/
COPY packages/claude-executor/ ./packages/claude-executor/
COPY packages/sandbox-adapter/ ./packages/sandbox-adapter/
COPY packages/artifact-store/ ./packages/artifact-store/
COPY packages/acceptance-client/ ./packages/acceptance-client/
COPY packages/port-mcp-server/ ./packages/port-mcp-server/
COPY apps/factory-coordinator/ ./apps/factory-coordinator/

# Copy factory contract definitions (AGENTS.md, skills, releases)
COPY factories/ ./factories/
COPY factory-releases/ ./factory-releases/
COPY contracts/ ./contracts/
COPY evaluation/ ./evaluation/
COPY db/ ./db/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Create evidence directory for artifact storage
RUN mkdir -p evidence/runs

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -S factory && adduser -S factory -G factory && \
    chown -R factory:factory /app
USER factory

CMD ["tsx", "apps/factory-coordinator/src/index.ts"]
