# OpenSandbox in the AI Software Factory Contract

## What OpenSandbox does

OpenSandbox provides **isolated execution environments** for each factory stage. When Claude executes a stage (requirements analysis, code generation, security scan), it does so inside a TTL-bound sandbox workspace — not on the coordinator host, not with unrestricted filesystem or network access.

## Two operating modes

| Mode | When | How |
|---|---|---|
| `local-docker` | `local-dev` profile | Temp directories on the coordinator host (`/tmp/factory-sandbox-{uuid}/`). No containerization. For learning and local testing. |
| `opensandbox` | `ci-integration` / `hardened` | External OpenSandbox API service. Full container isolation, resource limits, network egress restrictions. Required for shared/production use. |

## Package: `packages/sandbox-adapter`

The `SandboxAdapter` class handles both modes transparently:

```typescript
// packages/sandbox-adapter/src/index.ts
const sandbox = createSandboxAdapterFromEnv();

// Create an isolated workspace
const session = await sandbox.createSession({
  mode: "local-docker",   // or "opensandbox" when OPENSANDBOX_URL is set
  imageDigest: release.runtime.sandbox.imageDigest,
  ttlSeconds: 3600,
});

// Use session.workspaceDir for all file operations
// ...execute stage...

// Destroy — always, even on failure
await sandbox.destroySession(session);
```

## Configuration

```bash
# .env — local-dev profile (no OpenSandbox service needed)
# OPENSANDBOX_URL not set → auto-uses local-docker mode
DATABASE_URL=...
ANTHROPIC_API_KEY=...

# .env — ci-integration profile
OPENSANDBOX_URL=http://your-opensandbox-service:8080
OPENSANDBOX_API_KEY=your-key
OPENSANDBOX_DEFAULT_IMAGE=node:22-alpine
```

## Sandbox security properties

The sandbox enforces what Claude can and cannot do during a stage:

| Property | Enforcement |
|---|---|
| **File access** | Only reads/writes within the assigned workspace directory |
| **Command execution** | Only allowlisted commands from `getAllowedCommandsForStage(stage)` |
| **Network** | `networkEgress: restricted` in FactoryRelease config |
| **Lifetime** | TTL-bound (`ttlSeconds: 3600`); destroyed after artifacts collected |
| **Isolation** | In `opensandbox` mode: container-level isolation; in `local-docker` mode: process-level |

## imageDigest pinning

Both factory releases pin the sandbox image digest:

```yaml
# factory-releases/1.4.0/factory-release.yaml
sandbox:
  provider: opensandbox
  imageDigest: "sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a"
  resourceLimits:
    cpus: "2.0"
    memoryMb: 4096
    ttlSeconds: 3600
    networkEgress: restricted
```

This digest pins `node:22-alpine` from Docker Hub. Update it by running:
```bash
docker pull node:22-alpine
docker inspect node:22-alpine --format='{{index .RepoDigests 0}}'
# Then update both factory-releases/*.yaml and push
```

## For the PortCon demo

The reference implementation runs in `local-dev` profile (temp directories). This is explicitly documented as the intended starting point. For a shared production deployment:

1. Deploy an OpenSandbox-compatible container runtime (Docker + OpenSandbox API layer)
2. Set `OPENSANDBOX_URL` and `OPENSANDBOX_API_KEY` in `.env`
3. Run `pnpm factory doctor --profile ci-integration` to verify connectivity
4. The sandbox-adapter switches modes automatically

The `local-dev` profile is appropriate for PortCon: it exercises the full factory contract without requiring a production-grade isolated runtime.
