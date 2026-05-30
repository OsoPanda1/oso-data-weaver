
# Actualización Total — Kernel Canónico TAMV/UTAMV/ATLAS

Voy a materializar la especificación formal sobre el kernel actual (`oso-data-weaver`), conservando la doctrina ELITE HeHep y la arquitectura TanStack Start ya consolidada. No introduzco Neo4j/Qdrant/OPA reales (requieren infra externa) — implemento sus **contratos y adaptadores en memoria** con interfaces puras, listas para conectar después.

## Alcance

### Capa 1 — Modelo Canónico (`lib/canonical/`)
- `types.ts` — `CanonicalNode`, `CanonicalEdge`, `CanonicalEvent`, `CanonicalState`, `CanonicalMetadata`, `CanonicalSemantic`, `CanonicalDependency`, `CanonicalLineage`, `NodeType`.
- `hash.ts` — serialización canónica + `identityHash` / `versionHash` / `eventHash` (SHA-256).
- `invariants.ts` — validación de invariantes de nodo y de evento (cadena `prevHash`).

### Capa 2 — Kernel (`lib/kernel/`)
- `contract.ts` — contrato `K: (I,C,P,S) → (R,E,T,A)` tipado.
- `state-machine.ts` — estados `IDLE → INGESTING → CANONICALIZING → RETRIEVING → VALIDATING → RESPONDING → AUDITING` + `FAILED`, con transiciones válidas y emisión de traza obligatoria.
- `kernel.ts` — clase `TamvKernel` con `handleQuery`, `ingest`, `canonicalize`, `retrieveEvidence`, `validatePolicy`, `emitTrace`, `auditSession`. Principio RAG estricto: sin evidencia → respuesta `INSUFFICIENT_EVIDENCE`.

### Capa 3 — Memorias (`lib/memory/`)
- `graph-store.ts` — adaptador in-memory para grafo canónico (interfaz lista para Neo4j).
- `event-log.ts` — append-only con cadena `prevHash` verificable.
- `vector-index.ts` — stub de embeddings (interfaz lista para Qdrant/Lovable AI Embeddings).
- `object-store.ts` — interfaz para blobs (MinIO/IPFS futuro).

### Capa 4 — Gobernanza (`lib/governance/`)
- `policy-engine.ts` — motor de políticas declarativo (Rego-like en TS) con autorización, validación constitucional, anti-replay, rate-limit. Cada decisión emite traza.

### Capa 5 — Retrieval + Síntesis (`lib/retrieval/`)
- `dossier-builder.ts` — orquesta grafo + vector + externo, construye `EvidenceDoc[]` citables.
- `synthesizer.ts` — adaptador Lovable AI Gateway con restricción "solo evidencia provista".

### Capa 6 — Exposición (server functions + rutas API)
- `src/lib/integrations/kernel.functions.ts` — `kernelQuery`, `kernelIngest`, `kernelAudit`, `kernelHealth`, `kernelSystemic`.
- `src/routes/api/public/health.ts`, `src/routes/api/public/audit/$traceId.ts`, `src/routes/api/public/systemic.ts`.

### UI — Nueva ruta `/kernel`
- Panel de estado del kernel (state machine actual, métricas).
- Consola de query con dossier + trazas visibles.
- Inspector de eventos canónicos con verificación de cadena hash.
- Auditor de trazas por `traceId`.

### Integración con lo existente
- `manifest.ts` enriquecido con sección `canonical` (conteo de nodos/eventos/integridad).
- `Header.tsx` añade ítem "Kernel".
- `emitEliteBookPiEvent` se mantiene como bridge: cada `CanonicalEvent` también se publica en BookPI con `he_hep_context`.

## Detalles técnicos

```text
lib/
├── canonical/   types, hash, invariants
├── kernel/      contract, state-machine, kernel
├── memory/      graph-store, event-log, vector-index, object-store
├── governance/  policy-engine, policies/*.ts
└── retrieval/   dossier-builder, synthesizer

src/
├── lib/integrations/kernel.functions.ts
├── routes/kernel.tsx
└── routes/api/public/{health,systemic,audit.$traceId}.ts
```

Toda escritura es idempotente (`eventId` como clave). Toda lectura devuelve evidencia con `traceId`. El kernel rechaza síntesis sin dossier.

## Fuera de alcance (lo aviso explícitamente)
- Neo4j, Qdrant, MinIO, OPA reales — quedan como adaptadores con interfaz definida; se pueden conectar sin tocar el kernel.
- Clonar e ingerir literalmente los repos de OsoPanda1 — el conector `GithubIngestor` ya existe y se invocará desde `kernelIngest`; el barrido masivo se ejecuta bajo demanda desde `/kernel`.
- Firma criptográfica real de eventos — se deja `signature: "unsigned-dev"` con hook listo para Ed25519/PQ.

¿Procedo?
