# context.md — Trivium AI

Snapshot del estado real del repo (leído del código, no del roadmap). Complementa a `CLAUDE.md` (reglas) y `PLAN.md` (fases). Última actualización: 2026-10-19, tras la migración a Google Cloud (Cloud SQL + Prisma + Firebase Auth) y los hotfixes de deploy en Vercel. Rama de trabajo actual: `hotfix/grpc-dirname-shim`.

## Qué es

Plataforma B2B de IA generativa en español, con tres pilares: Escenarios Futuros, Generador de Productos/Servicios, Sustentabilidad. Los tres pilares tienen backend real (Vertex AI) y persisten en Cloud SQL vía Prisma. **Supabase ya no existe en el proyecto** (ver "Migración a Google Cloud").

## Stack real

- **Framework**: TanStack Start (`@tanstack/react-start` + `@tanstack/react-router`), no Next.js. Rutas basadas en archivos en `src/routes/` (`routeTree.gen.ts` autogenerado).
- **Backend**: no hay rutas `/api/*`; la lógica de servidor son **server functions** (`createServerFn`, archivos `*.functions.ts` en `src/services/`) llamadas como RPC. Los `services/*.ts` sin `.functions` son el contrato fino con la UI.
- **UI**: React 19 + Tailwind 4 + Radix UI (shadcn, `src/components/ui/`) + Recharts. Layout propio en `src/components/layout/AppLayout.tsx`.
- **DB**: Cloud SQL (Postgres 16) vía Prisma 6. `prisma/schema.prisma` + migración `20260925182708_init`. Acceso solo por `src/repositories/` (regla de ESLint `no-restricted-imports`); cada repository filtra por `organizationId`.
- **Auth**: Firebase Auth / Identity Platform. `organizationId` y `role` son custom claims del ID token, verificados con el Admin SDK en `src/lib/auth/verifyToken.ts` (`requireFirebaseAuth` / `requireOrganization`); el cliente adjunta el token con `src/lib/auth/tokenAttacher.ts`. `src/lib/firebase/client.ts` (web SDK) y `admin.ts` (server-only).
- **IA**: `src/lib/ai/` — `provider.ts` (`getAIProvider()`, switch por `AI_PROVIDER`), `vertex.ts` (Gemini en Vertex AI), `mock.ts` (`AI_PROVIDER=mock` para desarrollo sin credenciales), parsers con Zod y reintento de 1 vez.
- **Package manager**: bun (`bun.lock` versionado). `package-lock.json` está gitignored.

## Migración a Google Cloud (2026-09-25, completa en código)

Supabase (DB + Auth, provisionado por Lovable Cloud) fue reemplazado por completo. Hecho: schema Prisma + Postgres local (`docker-compose.yml`), Firebase Auth con custom claims, repositories para todas las entidades, las 6 pantallas migradas a server functions autenticados, `@supabase/supabase-js` y `src/integrations/supabase/**` eliminados, RLS reemplazado por autorización en repositories. Verificado en el navegador contra el emulador de Firebase Auth.

- Trigger `handle_new_user` y RPC `create_organization` → `authService.functions.ts` (`bootstrapFn`, `createOrganizationFn`, idempotentes).
- `profiles.id` pasó de FK a `auth.users` a `firebaseUid` propio.
- **Residuos conocidos**: la carpeta `supabase/` (sin trackear en git) sigue en el disco con las migraciones viejas; algunos comentarios y JSDoc en `src/services/*Service.ts` aún dicen "Supabase" (`productsService.ts`, `scenariosService.ts`, `sustainabilityService.ts`) y el comentario de cabecera de `prisma/schema.prisma` remite a ellas. Son solo texto, no código activo.
- Conexión a Cloud SQL desde Vercel: Vercel no tiene IP estática y exponer la instancia a `0.0.0.0/0` se descartó. Se usa el **Cloud SQL Node.js Connector** (`startLocalProxy()` en `src/repositories/prisma.ts`, túnel mTLS por IAM), activo solo si `CLOUD_SQL_CONNECTION_NAME` está seteada; si no, usa `DATABASE_URL` (dev local). No se puede probar en Windows nativo (socket Unix); se verificó desde un contenedor Linux.
- Prisma se inicializa de forma **lazy** (hotfix `f45feb4`) para no romper la app entera en cold start.

## Estado del deploy (Vercel)

Secuencia de hotfixes recientes, todos para destrabar el deploy de producción:

1. `f45feb4` / PR #2 — inicialización lazy de Prisma.
2. `91b7b5c` / PR #3 — actualización de TanStack Start por una vulnerabilidad XSS que bloqueaba el deploy.
3. `d4452ff` (rama `hotfix/grpc-dirname-shim`, **todavía sin PR ni merge a `main`**) — shim de `globalThis.__dirname` para que cargue `@google-cloud/cloud-sql-connector` en Vercel.

**No verificado en esta actualización**: si el deploy de producción ya funciona de punta a punta con ese último shim. Confirmarlo es el primer paso pendiente.

## Credenciales y env vars

- Secretos solo en `.env.local` o en las env vars de Vercel. `.env` ya no se trackea (commit `468aed3`), pero el historial público de GitHub conserva valores viejos (commit `beb8fdc`). La `SUPABASE_SERVICE_ROLE_KEY` expuesta ya fue rotada; con Supabase eliminado deja de ser relevante. La lista completa de variables está en `.env.example`.
- Proyecto de Google Cloud: `trivium-509620`, org `pampai.com`. No confundir con otros proyectos de la misma org (Furlong Asistencias, Consultorio Odontologia, Curso Langchain, My First Project, Invoice OCR).
- Service accounts: `trivium-scenarios-vertex@…` (`roles/aiplatform.user`, Vertex AI) y `trivium-app-backend@…` (`roles/firebaseauth.admin` + `roles/cloudsql.client`). La consola en español muestra el rol de Vertex como "Usuario de Agent Platform".
- Cloud SQL: instancia `trivium-db` (`db-f1-micro`, `us-central1`), migración inicial aplicada, `authorizedNetworks` vacío.
- Modelo: `VERTEX_AI_MODEL=gemini-3.8-flash`, `VERTEX_AI_LOCATION=global`. Los IDs de modelo envejecen rápido: chequear Model Garden antes de asumir uno.
- `MARKET_DATA_API_KEY` (Alpha Vantage) ya está cargada en `.env.local`; sin ella `getQuoteWithFallback` degrada a `dataSource: "manual"`.
- El harness bloquea leer `.env*` con Bash/Read; para `.env.local` usar Write/Edit directo.

## Rutas (`src/routes/`)

- Públicas: `index.tsx`, `auth.tsx`, `reset-password.tsx`.
- `_authenticated/route.tsx` — guard: redirige a `/auth` si no hay sesión de Firebase (`ssr: false`).
- `_authenticated/{dashboard,escenarios,productos,sustentabilidad,clientes,configuracion,onboarding}.tsx`.
- `src/hooks/useAuth.tsx` — contexto React sobre Firebase Auth. Roles: `admin | cliente`.

## Modelo de datos (`prisma/schema.prisma`)

`Organization`, `Profile` (clave `firebaseUid`), `UserRole`, `OrgResource`, `Analysis`, `Scenario`, `Client`, `Proposal`, `Initiative`, `Kpi`, `KpiMeasurement`, `ProposalFeedback`, `ScenarioFeedback`, `AiCallLog`. `assets` y `variables` de `Analysis` son `Json`, no tablas separadas. Tipos de dominio del frontend en `src/lib/types.ts`.

## Los tres pilares

Flujo común: pantalla → `services/*Service.ts` → server function (`*.functions.ts`, auth con `requireFirebaseAuth`/`requireOrganization`) → `getAIProvider()` → validación Zod → persistencia vía repository → devuelve datos con ids reales de DB.

- **Escenarios**: ≥3 escenarios (optimista, esperado, pesimista) validados con `scenariosResponseSchema`. Datos de mercado en `src/lib/market/` (Alpha Vantage, caché de 15 min, degradación a manual). Riesgo en `src/lib/risk.ts` (volatilidad ponderada v1, detrás de la interfaz `RiskCalculator`, reemplazable por Cloud Run/Python).
- **Productos**: `generateProposals(segment, channel, cadence, count?)` persiste propuestas; `generateRecommendations` (co-creación) no persiste nada. Los schemas del LLM (`proposalDraftSchema`) no incluyen `id` ni `status`: el server function fuerza `status: "borrador"`, así nada se auto-envía. `buildMessageTemplate` es lógica determinística, no IA.
- **Sustentabilidad**: iniciativas con `goal` medible, `plan[]` con fechas y 3–5 `kpis[]` con target y unidad (`initiativeDraftSchema`); `scopes` restringido a `SUSTAINABILITY_SCOPES`. Se persiste la iniciativa y luego sus KPIs.
- **Feedback loop** (Fase 4): aprobar/rechazar con motivo opcional se guarda en `proposal_feedback`/`scenario_feedback`; `src/lib/server/feedbackContext.ts` resume el historial y lo inyecta en el prompt (no reentrena nada).
- **Observabilidad**: `ai_call_logs` (flow, provider, model, status, attempts, duration_ms) vía `src/lib/server/aiCallLog.ts`, más rate limit por organización (`AI_RATE_LIMIT_PER_HOUR`, default 30).

## Seed de datos demo (2026-10-19, rama `feat/seed-demo`)

`bun run seed` genera 7 organizaciones ficticias con prefijo `[DEMO] ` (distribución, software, agro, energía, textil, logística, salud), cada una con usuarios `demo-seed-*`, recursos, 2 análisis con 3 escenarios exactos, 8–15 clientes (contactos 100% sintéticos: `@example.com`, `+54 9 11 5555-0xxx`), 4–5 propuestas (solo `borrador`; la aprobación vive como `proposal_feedback`, el schema no tiene estado "aprobada"), 2 iniciativas con 3–4 KPIs y mediciones históricas jun–oct 2026, y feedback para el feedback loop. Determinístico (RNG seed fijo) e idempotente por regeneración: borra lo demo y lo recrea igual. `bun run seed:reset` borra SOLO lo demo (prefijos). Guard anti-producción: aborta si `CLOUD_SQL_CONNECTION_NAME` o `DATABASE_URL` no-local, salvo `--allow-production` + `SEED_ALLOW_PRODUCTION=yes`. Usuarios de Firebase solo contra el emulador (password `Demo1234!`); sin emulador, se omiten. Helpers de DB en `src/repositories/demoSeed.ts` (regla de ESLint respetada). Datos informados por UCI Online Retail II y OWID CO2 (CC BY 4.0, sin copiar filas); `scripts/seedData/distill.ts` recalibra parámetros si se descargan los datasets a `scripts/seedData/raw/` (gitignored). Verificado en la máquina del usuario (2026-10-19): corrida completa contra Postgres local + emulador con 7 orgs / 42 escenarios / 77 clientes / `firebaseUsersCreated: true`. Pendiente: `bun run test` (incluye `tests/unit/seed.test.ts`) y revisión visual de las 6 pantallas.

## Tests

Vitest (`bun run test`) en `tests/unit/`: riesgo, schemas, parsers (escenarios, productos, sustentabilidad), reintentos de Vertex (con `callModel` inyectado), `feedbackContext`, `orgScoping` y `bootstrap` (estos dos contra el Postgres local, sin mockear Prisma). E2E con Playwright en `tests/e2e/` (`escenarios.spec.ts`, API mockeada). **No corrí lint ni tests en esta actualización**; el último estado en verde registrado está en `PLAN.md` (Fase 5).

## Pendientes (para priorizar)

1. **Confirmar el deploy de producción** con el shim de `__dirname` y abrir PR de `hotfix/grpc-dirname-shim` a `main`.
2. Checklist de env vars en Vercel (production): `CLOUD_SQL_CONNECTION_NAME`, `CLOUD_SQL_DB_USER`, `CLOUD_SQL_DB_PASSWORD`, `CLOUD_SQL_DB_NAME`, `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_CREDENTIALS_JSON`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `VITE_FIREBASE_*` (sin `VITE_FIREBASE_USE_EMULATOR`). Falta agregar el dominio real de producción a los `authorizedDomains` de Identity Platform. Ver el detalle en `PLAN.md`, Fase 5.
3. Pausar (no borrar) el proyecto viejo de Supabase por 30 días de rollback (hay que investigar si se hace desde Lovable, porque el proyecto no está en la cuenta personal).
4. Envío real de propuestas por Email/LinkedIn/WhatsApp: no existe `lib/messaging/`. `proposals.status` puede llegar a `"enviada"` en la UI, pero nada dispara un envío real. Falta también consentimiento y baja por cliente y canal.
5. Tokens y costo por llamada a Vertex no se loguean (`callGenerateContent` no expone `usageMetadata`; cambiar su firma rompería los tests que inyectan `callModel`). Es requisito para comparar costos Google vs. externos.
6. Sin empezar: clustering de clientes (BigQuery ML / AutoML), Google Custom Search para competidores, Gmail API, Cloud Scheduler → Cloud Run para jobs periódicos, Google Analytics 4, servicio Python de riesgo en Cloud Run.
7. `tests/e2e/` tiene ~43 errores de `prettier/prettier` (CRLF), preexistentes. `bun.lock` puede necesitar un `bun install` si se agregaron dependencias con npm.
8. Limpieza: borrar o archivar `supabase/` y corregir los comentarios que aún mencionan Supabase.
