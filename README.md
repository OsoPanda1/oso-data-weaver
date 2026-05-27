# OSO Data Weaver — TAMV Kernel Core

`OsoPanda1/oso-data-weaver` is the kernel core for the TAMV ecosystem. It fuses the original TAMV orchestrator into a self-contained executable layer for federation, state recovery, multi-agent workflow execution, data weaving and cross-repository coordination.

## Kernel Responsibilities

- Own the TAMV federation protocol: `tamv-federation-v1`.
- Maintain the canonical node registry for connected repositories.
- Publish and validate signed JSONL events with SHA-256 integrity hashes.
- Execute recoverable directed workflows with dependency resolution.
- Run the core TAMV agents for geometry, unfolding, layout, rendering, UI state and optimization.
- Persist workflow snapshots under `.tamv/state`.
- Provide operational commands through `npm run tamv:*`.

## Repository Map

```text
tamv/
  cli/
    tamv.mjs                         # Operator CLI
  core/
    federation-bus.mjs               # Event bus, manifests, registry, dispatch planning
    sovereign-kernel.mjs             # Workflow graph, agents, recovery, snapshots
  protocol/
    tamv-federation-v1.schema.json   # Node manifest schema
  registry/
    nodes.json                       # Canonical fused node registry
  node.manifest.json                 # oso-data-weaver kernel identity
```

## Connected Nodes

The fused registry currently wires these repositories into the TAMV network:

- `OsoPanda1/oso-data-weaver` as `tamv.oso-data-weaver` kernel
- `OsoPanda1/tamv-orchestrator` as orchestration peer
- `OsoPanda1/tamv-core-engine` as core engine peer
- `OsoPanda1/tamv-sovereign-api` as API/event ingress peer
- `OsoPanda1/tamv-nexus-goldprint-system` as print/PDF peer
- `OsoPanda1/tamvweb` as frontend peer
- `OsoPanda1/tamv-nexus-core` as agent/reflection peer
- `OsoPanda1/tamv-atlas` as knowledge peer
- `OsoPanda1/datostamv` as data ledger peer
- `OsoPanda1/real-del-monte-explorer-11b3982a` as asset/content peer

## Commands

```sh
npm run tamv:heartbeat
npm run tamv:inspect
npm run tamv:snapshot
npm run tamv:registry
npm run tamv:dispatch
npm run tamv:run-demo
```

The demo workflow executes the TAMV fairy papercraft pipeline as a recoverable state machine:

1. `GeometryAgent` produces the 80cm fairy collectible model plan.
2. `UnfoldAgent` defines graph-based unfolding, edge classification and UV flattening output.
3. `LayoutAgent` prepares A4 100+ page layout requirements.
4. `RenderAgent` emits print-ready white/gold PDF bundle outputs.
5. `UIAgent` exposes frontend control and export state.
6. `OptimizeAgent` scores quality and reports the next iteration state.

## Event State

Events are stored locally at:

```text
.tamv/state/events.jsonl
```

Each event includes:

- `protocol`
- `type`
- `source`
- `repository`
- `createdAt`
- `payload`
- `meta`
- `integrity`

The kernel refuses to append events with invalid integrity.

## Recovery Model

Workflow state is persisted at:

```text
.tamv/state/workflows.json
.tamv/state/kernel-snapshot.json
```

Recover a workflow with:

```sh
node tamv/cli/tamv.mjs recover <workflowId>
```

## Integration Contract

Every connected repository should expose:

```text
tamv/node.manifest.json
tamv/heartbeat.mjs
```

A node manifest must define:

- `nodeId`
- `repository`
- `role`
- `capabilities`
- `channels.publishes`
- `channels.subscribes`
- `state.persistence`

## Operational Notes

This kernel is intentionally dependency-free at the TAMV layer. It uses only Node.js built-in modules so it can run inside frontend, backend or worker repositories without forcing new package dependencies.

The current layer is file-backed and local-first. Network transport, GitHub event collection, Supabase persistence or queue workers can be added as adapters without changing the protocol or agent contract.

## Next Implementation Phase

1. Promote `tamv-sovereign-api` into the network collector for repository heartbeats.
2. Add scheduled ingestion into `datostamv`.
3. Wire `tamvweb` export controls to publish `EXPORT_REQUESTED`.
4. Connect `tamv-nexus-goldprint-system` to consume `GEOMETRY_READY` and publish `PDF_READY`.
5. Add release bundle generation in `tamv-sovereign-hub`.

## Status

TAMV kernel fusion is active. `oso-data-weaver` is now the canonical kernel core for the project.
