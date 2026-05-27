# Workspace Knowledge - ELITE HeHep / TAMV Core Kernel

## Contexto Y Proposito

Este workspace pertenece al TAMV Core Kernel y al ecosistema TAMV ONLINE NETWORK. El kernel es infraestructura central de la Heptafederacion MD-X4: repos conectados, federaciones doctrinales, BookPI, contratos y router heptafederado.

Ontologia principal:

- ELITE HeHep = Ecosistema Latino Interfederado TAMV Enterprise - Hexagonal Heptafederado.
- He = pipelines hexagonales:
  - `HE-Ingest`
  - `HE-Transform`
  - `HE-Publish`
  - `HE-Science`
  - `HE-Economy`
  - `HE-Identity`
- Hep = dominios heptafederados:
  - `HEP-1 Central`
  - `HEP-2 Operaciones`
  - `HEP-3 Infraestructura`
  - `HEP-4 Seguridad`
  - `HEP-5 Financiera`
  - `HEP-6 Logistica`
  - `HEP-7 Usuarios`

La IA debe tratar este workspace como infraestructura central de un ecosistema federado y etico de alto rigor academico.

## Reglas Generales

- Idioma: espanol neutro.
- Tono: profesional, claro, directo.
- Evitar afirmaciones de marketing sin capacidad real.
- Respetar soberania tecnologica latinoamericana sin comparaciones serviles con Big Tech.

Doctrina MD-X4:

1. Contratos compartidos: definir tipos, schemas, OpenAPI y eventos antes de escribir logica.
2. Eventos via BookPI: no generar llamadas directas entre dominios cuando debe existir evento.
3. CI/CD en cadena: pensar `core -> dominios -> deploy`.

Seguridad y etica IsabellaCoreProtocol:

- Proteger dignidad humana, equidad, privacidad, consentimiento informado y gobernanza etica.
- En datos sensibles o decisiones criticas: guardianes, filtrado en 4 capas y audit trail en BookPI.

## Estilo De Codigo

Frontend/kernel UI:

- TypeScript + React + TanStack Router + TailwindCSS.
- Componentes TAMV bajo `@/components/tamv/*` cuando exista UI.
- Evitar CSS-in-JS pesado.

Backend/kernel:

- TypeScript/Node.
- Modulos en `lib/*` o `tamv/core/*` segun capa.
- GitHub como ledger de verdad y BookPI como ledger de eventos cuando existan conectores reales.

Estilo:

- TypeScript estricto cuando tenga sentido.
- Tipos explicitos en contratos y modelos.
- Nombres semanticos: `KnowledgeCell`, `TAMVArtifact`, `HeHepContext`, `EliteHeHepEvent`.
- Funciones pequenas y puras si es posible.
- Efectos en adaptadores (`*-client.ts`, `*-emitter.ts`, `*-provider.ts`).

## Patrones Clave

CQRS + Event Sourcing:

- Separar comandos/escrituras de consultas/lecturas.
- Antes de crear APIs, definir comandos, eventos y proyecciones.

ELITE HeHep en eventos:

Todo evento hacia BookPI debe incluir:

```ts
type HeHepContext = {
  hexagon: 'HE-Ingest' | 'HE-Transform' | 'HE-Publish' | 'HE-Science' | 'HE-Economy' | 'HE-Identity';
  domain: 'HEP-1' | 'HEP-2' | 'HEP-3' | 'HEP-4' | 'HEP-5' | 'HEP-6' | 'HEP-7';
};
```

Reglas de asignacion:

- Kernel central: `HEP-1`.
- Ingesta: `HE-Ingest`.
- Procesamiento/guardianes: `HE-Transform`.
- Eventos/contratos/publicacion: `HE-Publish`.
- Ciencia abierta/DOIs: `HE-Science`.
- Economia/reputacion/tokens: `HE-Economy`.
- Identidad/etica/recomendaciones: `HE-Identity`.

Hexagonal / Ports & Adapters:

- Dominio puro sin dependencias de frameworks.
- GitHub, BookPI, Supabase, blockchain, XR y otros transportes detras de interfaces.

## Orden De Investigacion

1. Manifest publico del kernel: `GET /api/public/manifest` en `kernel-tamv.lovable.app`.
2. Repositorio actual:
   - `tamv/core/*`
   - `tamv/protocol/*`
   - `tamv/registry/*`
   - `routes/*` si existe.
   - `lib/knowledge/*`, `lib/ecosystem/*`, `lib/contracts/*` si existen.
3. Repos conectados clave:
   - `tamv-digital-nexus`
   - `tamv-atlas`
   - `symbol-forge`
   - `utamv-campus`
   - `utamv-elite-masterclass`
   - `ecosistema-nextgen-tamv`
   - `tamvonline-metanextgen`
   - `RDM-Digital-X` y familia XR/territorio.
4. Documento doctrinal `tamvfederada3.docx` como referencia de doctrina y limites eticos.

## Reglas Para Implementaciones

Nuevos modulos de dominio:

- Definir tipos primero.
- Definir eventos asociados.
- Agregar `he_hep_context` a eventos.
- Crear adaptadores para efectos externos.

BookPI, ledger o contratos:

- No emitir eventos ad-hoc.
- Usar `emitEliteBookPiEvent` o crear equivalente.
- Validar contexto He/Hep, integridad y audit trail.

UI:

- Mantener coherencia visual del kernel.
- Fondo negro, estado monoespaciado, acentos dorados/emerald.
- Etiquetas `HEP-*` y pipelines `HE-*` cuando ayuden al grafo.
- No introducir UI kits nuevos sin necesidad.

## Preferencias Tecnologicas

- React, TanStack Router, TailwindCSS.
- Zod o JSON Schema para schemas.
- Tipos propios para graph/knowledge salvo necesidad clara.
- Web3 con ethers.js o viem si se integran contratos.
- Cripto post-cuantica siguiendo recomendaciones NIST con librerias maduras.
- RAG/embeddings detras de motores propios (`*Engine`, `*Service`).

## Prohibiciones

- No convertir MD-X4 en CRUD monolitico.
- No introducir dependencias pesadas innecesarias.
- No asumir conectores inexistentes.
- No romper archivos autogenerados.
- No saltarse BookPI cuando corresponda comunicacion por eventos.
