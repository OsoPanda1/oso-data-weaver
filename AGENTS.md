# AGENTS.md - TAMV Core Kernel Workspace Instructions

## Identidad Del Workspace

Este repositorio pertenece al TAMV Core Kernel y al ecosistema TAMV ONLINE NETWORK. `OsoPanda1/oso-data-weaver` es el kernel core operativo del proyecto: federacion, estado recuperable, eventos, agentes, contratos y data weaving.

El kernel trabaja bajo la ontologia ELITE HeHep:

- ELITE HeHep: Ecosistema Latino Interfederado TAMV Enterprise - Hexagonal Heptafederado.
- He: pipelines hexagonales (`HE-Ingest`, `HE-Transform`, `HE-Publish`, `HE-Science`, `HE-Economy`, `HE-Identity`).
- Hep: dominios heptafederados (`HEP-1` a `HEP-7`).

Trata este workspace como infraestructura central de un ecosistema federado, academico, etico y de soberania tecnologica latinoamericana.

## Comportamiento Esperado

- Escribir en espanol neutro, profesional, claro y directo.
- Evitar marketing vacio: cada afirmacion debe corresponder a una capacidad real o a un plan concreto.
- Respetar la doctrina MD-X4:
  - Contratos compartidos antes de logica.
  - Eventos via BookPI cuando haya cruce de dominios.
  - CI/CD en cadena: `core -> dominios -> deploy`.
- Respetar IsabellaCoreProtocol:
  - No proponer implementaciones que violen dignidad humana, equidad, privacidad, consentimiento informado o gobernanza etica.
  - En flujos sensibles, incorporar guardianes, filtrado en 4 capas y audit trail en BookPI.

## Arquitectura Y Codigo

Lenguajes principales:

- Frontend: TypeScript, React, TanStack Router, TailwindCSS.
- Kernel/backend: TypeScript/Node o modulos ESM Node sin dependencias cuando el objetivo sea infraestructura portable.
- Contratos: JSON Schema o Zod segun contexto.

Patrones obligatorios:

- CQRS + Event Sourcing.
- Ports & Adapters / arquitectura hexagonal.
- Tipos y eventos antes de implementar efectos.
- Adaptadores para GitHub, BookPI, Supabase, blockchain, XR o transportes externos.
- Funciones pequenas y puras cuando sea posible.
- Efectos encapsulados en `*-client.ts`, `*-provider.ts`, `*-emitter.ts` o modulos equivalentes.

Nombres semanticos recomendados:

- `KnowledgeCell`
- `TAMVArtifact`
- `HeHepContext`
- `EliteHeHepEvent`
- `BookPiLedgerEntry`
- `FederationNode`

## Modelo De Eventos ELITE HeHep

Todo evento que salga del kernel hacia BookPI debe incluir `he_hep_context`:

```ts
type HeHepContext = {
  hexagon: 'HE-Ingest' | 'HE-Transform' | 'HE-Publish' | 'HE-Science' | 'HE-Economy' | 'HE-Identity';
  domain: 'HEP-1' | 'HEP-2' | 'HEP-3' | 'HEP-4' | 'HEP-5' | 'HEP-6' | 'HEP-7';
};
```

Reglas:

- Kernel central: `domain = 'HEP-1'`.
- Ingesta: `HE-Ingest`.
- Procesamiento/guardianes: `HE-Transform`.
- Eventos/contratos/publicacion: `HE-Publish`.
- Ciencia abierta/DOIs: `HE-Science`.
- Economia/reputacion/tokens: `HE-Economy`.
- Identidad/etica/recomendaciones personales: `HE-Identity`.

No emitir eventos ad-hoc hacia BookPI. Crear o usar siempre un wrapper tipo `emitEliteBookPiEvent` que valide contexto, compute o delegue integridad y llame al transporte existente.

## Orden De Investigacion

Cuando haya que ubicar una implementacion o disenar un cambio:

1. Revisar el manifest publico del kernel: `GET /api/public/manifest` en `kernel-tamv.lovable.app`.
2. Revisar el repositorio actual:
   - `tamv/core/*`
   - `tamv/protocol/*`
   - `tamv/registry/*`
   - `src/routes/*` si aplica UI.
   - `lib/knowledge/*`, `lib/ecosystem/*`, `lib/contracts/*` si existen.
3. Revisar repos conectados clave:
   - `tamv-digital-nexus`
   - `tamv-atlas`
   - `symbol-forge`
   - `utamv-campus`
   - `utamv-elite-masterclass`
   - `ecosistema-nextgen-tamv`
   - `tamvonline-metanextgen`
   - `RDM-Digital-X` y familia XR/territorio.
4. Usar documentos doctrinales como referencia de alcance, limites eticos y arquitectura; no copiar codigo literal desde documentos narrativos.

## Implementaciones Nuevas

Antes de crear un modulo de dominio:

1. Definir interfaces TypeScript.
2. Definir comandos.
3. Definir eventos.
4. Definir proyecciones/ledger.
5. Implementar logica pura.
6. Implementar adaptadores.
7. Agregar validacion y pruebas proporcionales al riesgo.

Si toca BookPI, ledger o contratos:

- No llamar transportes directamente desde dominio.
- Pasar por `emitEliteBookPiEvent` o modulo equivalente.
- Agregar `he_hep_context`.
- Validar integridad y auditabilidad.

Si toca UI:

- Mantener coherencia visual con kernel: fondo negro, estado monoespaciado, acentos dorados/emerald.
- Usar React + Tailwind.
- No introducir librerias UI nuevas sin necesidad clara.
- No romper archivos autogenerados de TanStack Router.

## Que No Hacer

- No degradar MD-X4 a CRUD monolitico.
- No introducir dependencias grandes innecesarias.
- No asumir que BookPI, blockchain, Supabase o XR ya estan conectados si no existen conectores reales.
- No romper ni sobreescribir archivos autogenerados.
- No mezclar dominios directamente si deben comunicarse por eventos.

## Comandos Del Kernel

```sh
npm run tamv:heartbeat
npm run tamv:inspect
npm run tamv:snapshot
npm run tamv:registry
npm run tamv:dispatch
npm run tamv:run-demo
```

## Estado Canonico

`oso-data-weaver` es el kernel core canonico. `tamv-orchestrator` queda como peer federado y legado operacional conectado al kernel.
