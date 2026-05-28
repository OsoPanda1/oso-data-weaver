# OSO Data Weaver - TAMV Kernel Core

`OsoPanda1/oso-data-weaver` is the kernel core for the TAMV ecosystem. It fuses the original TAMV orchestrator into a self-contained executable layer for ELITE HeHep ontology, BookPI events, federation, state recovery, multi-agent workflow execution, data weaving and cross-repository coordination.

## Kernel Responsibilities

- Own the TAMV federation protocol: `tamv-federation-v1`.
- Own the ELITE HeHep ontology: He pipelines and Hep domains.
- Maintain the canonical node registry for connected repositories.
- Publish and validate signed JSONL federation events with SHA-256 integrity hashes.
- Publish hardened BookPI events with mandatory `he_hep_context`.
- Execute recoverable directed workflows with dependency resolution.
- Validate ORCID, Zenodo and Figshare server-side without exposing secrets.
- Persist versioned snapshots of `/api/public/manifest` on every sync.
- Receive GitHub webhooks and expose event status for dashboard refresh.
- Provide operational commands through `npm run tamv:*`.

## ELITE HeHep Identity

ELITE HeHep means `Ecosistema Latino Interfederado TAMV Enterprise - Hexagonal Heptafederado`.

- He pipelines: `HE-Ingest`, `HE-Transform`, `HE-Publish`, `HE-Science`, `HE-Economy`, `HE-Identity`.
- Hep domains: `HEP-1` Central, `HEP-2` Operaciones, `HEP-3` Infraestructura, `HEP-4` Seguridad, `HEP-5` Financiera, `HEP-6` Logistica, `HEP-7` Usuarios.
- Kernel context: `HEP-1` with `HE-Publish` and `HE-Science` active.

## Repository Map

```text
src/routes/config.tsx                      # Live configuration screen
src/routes/repos.tsx                       # Filtered repo dashboard
src/routes/api/public/manifest.ts          # Public manifest + snapshot save
src/routes/api/public/manifest/history.ts  # Snapshot history
src/routes/api/public/manifest/compare.ts  # Snapshot diff
src/routes/api/github/webhook.ts           # GitHub webhook receiver
src/routes/api/github/events.ts            # Webhook event status
src/routes/api/github/events/stream.ts     # SSE webhook event stream
src/lib/integrations/open-science.ts       # ORCID/Zenodo/Figshare validators
src/lib/integrations/manifest-snapshots.ts # Versioned manifest snapshots
src/lib/integrations/github-webhook-store.ts
lib/contracts/*                            # ELITE HeHep and BookPI contracts
tamv/core/*                                # Runtime kernel, BookPI and federation bus
```

## Public Endpoints

```text
GET  /api/public/manifest
GET  /api/public/manifest/history
GET  /api/public/manifest/compare?before=<id>&after=<id>
POST /api/github/webhook
GET  /api/github/events
GET  /api/github/events/stream
```

## Configuration Screen

`/config` shows:

- ORCID, Zenodo and Figshare validation status.
- Live latency in milliseconds.
- Sanitized errors only.
- Secret configuration state without exposing token values.
- Manifest snapshot history.
- GitHub webhook status and latest delivery.

Required server environment variables:

```text
GITHUB_TOKEN
GITHUB_WEBHOOK_SECRET
ORCID_ID or ORCID_CLIENT_ID / ORCID_API_KEY
ZENODO_ACCESS_TOKEN or ZENODO_API_KEY
FIGSHARE_TOKEN
```

## Repo Dashboard Filters

`/repos` supports:

- Search by repo, title, summary, layer or language.
- Filter by federation.
- Filter by language.
- Filter active, archived or all repos.
- Webhook-highlighted latest repo changes.

## Commands

```sh
npm run tamv:heartbeat
npm run tamv:inspect
npm run tamv:snapshot
npm run tamv:registry
npm run tamv:dispatch
npm run tamv:run-demo
npm run tamv:elite
npm run tamv:bookpi
```

## Event State

Federation events are stored locally at:

```text
.tamv/state/events.jsonl
```

BookPI events are stored locally at:

```text
.tamv/state/bookpi-events.jsonl
```

Manifest snapshots are stored locally at:

```text
.tamv/manifest-snapshots/
```

GitHub webhook deliveries are stored locally at:

```text
.tamv/github-webhooks/events.json
```

## GitHub Webhook Setup

Configure each relevant GitHub repository or organization webhook with:

- Payload URL: `https://<kernel-domain>/api/github/webhook`
- Content type: `application/json`
- Secret: value of `GITHUB_WEBHOOK_SECRET`
- Events: `push`, `repository`, `workflow_run`, `pull_request`, `issues` as needed.

The receiver validates `x-hub-signature-256` and rejects unsigned or invalid payloads.

## Status

TAMV kernel fusion is active. `oso-data-weaver` is now the canonical ELITE HeHep / TAMV kernel core for the project.
