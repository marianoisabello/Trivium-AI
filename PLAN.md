# PLAN.md — Roadmap por fases

## Fase 0 — MVP (Lovable) · 1–2 semanas
- [ ] Generar MVP con `prompt-lovable.md` + prompts de refinamiento.
- [ ] Conectar Supabase (auth + tablas base).
- [ ] Exportar a GitHub y conectar Vercel (deploy automático).
- [ ] Copiar `CLAUDE.md` a la raíz del repo.

## Fase 1 — Backend real de Escenarios (Claude Code) · 2–3 semanas
- [x] Crear el endpoint de generación de escenarios: recibe cartera + variables, llama al LLM vía `lib/ai`, devuelve 3+ escenarios validados con Zod. Nota: implementado como server function de TanStack Start (`src/services/scenariosService.functions.ts`, `createServerFn` + middleware `requireSupabaseAuth` ya existente) — esta versión del framework no expone rutas de archivo tipo `/api/*`, así que esto reemplaza conceptualmente el endpoint REST descripto originalmente.
- [x] Integrar datos de mercado (`lib/market`, adapter Alpha Vantage) para rendimiento de acciones/derivados, con caché de 15 min y degradación a `dataSource: "manual"` si la API falla.
- [x] Cálculo de riesgo de cartera (volatilidad ponderada) en TypeScript v1 (`src/lib/risk.ts`), detrás de una interfaz reemplazable después por el servicio Python (Cloud Run).
- [x] Persistir análisis y escenarios en Supabase; conectar frontend. Nota: se usa el cliente Supabase con el JWT del usuario (ya resuelto por `requireSupabaseAuth`, respeta RLS) en vez de `SUPABASE_SERVICE_ROLE_KEY` — no hace falta bypasear RLS para un insert dentro de la propia organización, y así se evita un cliente con permisos más amplios de lo necesario.
- [x] Tests unitarios (Vitest) del cálculo de riesgo, el schema Zod de escenarios y el parser + reintento de la respuesta del LLM.

Credenciales de Google Cloud creadas (2026-09-24): proyecto `trivium-509620` (org pampai.com), service account `trivium-scenarios-vertex@trivium-509620.iam.gserviceaccount.com` con rol `roles/aiplatform.user`, API de Vertex AI ya habilitada, billing ya vinculado. `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `VERTEX_AI_MODEL=gemini-3.8-flash` viven en `.env.local` (gitignored, no en `.env` porque ese archivo está trackeado en el repo). `VERTEX_AI_LOCATION` default `global` (no regional) — es el endpoint recomendado actual para Gemini. Pendiente: `MARKET_DATA_API_KEY` (Alpha Vantage) para datos de mercado — sin ella, `getQuoteWithFallback` degrada a `dataSource: "manual"` automáticamente, no rompe nada. Para desarrollar sin pegarle a Vertex real, `AI_PROVIDER=mock`.

## Fase 2 — Generador de productos · 2–3 semanas
- [ ] `/api/products/recommend`: historial de consumo del cliente + catálogo → recomendaciones LLM.
- [ ] Clustering de clientes (BigQuery ML o scikit-learn) para segmentos.
- [ ] Canal automático: job periódico (Vercel Cron o Cloud Scheduler) que genera propuestas por segmento → cola de aprobación → envío por Resend/Gmail API y WhatsApp Cloud API. LinkedIn: generar borrador para envío manual (API restringida).
- [ ] Consentimiento y baja (unsubscribe) por cliente y canal.
- [ ] Co-creación: conectar la interfaz de usuario final al endpoint de recomendaciones.
- [ ] Cursor: tests e2e del flujo aprobar → programar → enviar (con mocks de mensajería).

## Fase 3 — Sustentabilidad · 1–2 semanas
- [ ] `/api/sustainability/propose`: recursos de la organización → iniciativas con meta, plan de acción y KPIs (LLM con schema estricto).
- [ ] Registro de mediciones de KPIs y dashboard de progreso.
- [ ] Cursor: tests de validación de schema (meta medible, 3–5 KPIs).

## Fase 4 — Retroalimentación y hardening · continuo
- [x] Feedback loop: aprobar/rechazar (con motivo opcional) propuestas y escenarios desde la UI, persistido en `proposal_feedback`/`scenario_feedback`. El historial reciente de la organización se resume (`src/lib/server/feedbackContext.ts`) y se inyecta como contexto extra en el prompt de `generateProposalsFn`/`generateScenariosFn` — "re-ranking simple" en la práctica es condicionar el prompt, no reentrenar nada.
- [x] Observabilidad: `ai_call_logs` (flow, provider, model, status, duration_ms) logueado en los 4 server functions de generación vía `src/lib/server/aiCallLog.ts`; rate limiting simple por organización (`AI_RATE_LIMIT_PER_HOUR`, default 30/hora) contra la misma tabla. **Costos en USD/tokens por proveedor no incluido todavía** — `callGenerateContent` en `vertex.ts` solo devuelve el texto, no `usageMetadata`; cambiar esa firma rompería en cascada los tests que inyectan `callModel`, se dejó fuera de esta pasada.
- [ ] Comparar costos Google vs. externos con datos reales de uso y fijar proveedor por función — sigue sin poder hacerse: necesita datos reales que `ai_call_logs` recién empieza a juntar, y además tokens/costo todavía no se loguean (ver punto anterior).

~~Migración pendiente de aplicar por el usuario: `supabase/migrations/20260924190000_feedback_and_ai_observability.sql`~~ — obsoleto, ver Fase 5: Supabase se reemplazó por completo, `proposal_feedback`/`scenario_feedback`/`ai_call_logs` ahora son modelos de `prisma/schema.prisma`.

## Fase 5 — Migración a Cloud SQL + Firebase Auth (independencia de Lovable Cloud) · 2026-09-25

Reemplazo completo de Supabase (DB + Auth) por infraestructura propia en Google. Motivo: el proyecto de Supabase que usaba la app en runtime resultó estar provisionado por Lovable Cloud bajo una organización a la que la cuenta personal del equipo no tenía acceso — ni siquiera aparecía listado al intentar administrarlo, lo que costó bastante diagnosticar. Trabajado en la rama `feat/migracion-google`, un commit por sección:

- [x] **Sección 1** — `prisma/schema.prisma` (replica el schema real de las migraciones de Supabase, no el del PRD original) + `docker-compose.yml` con Postgres 16 local. Verificado con un smoke test real (create/read/delete) antes de commitear.
- [x] **Sección 2** — Firebase Auth reemplaza Supabase Auth. `organizationId`/`role` como custom claims del ID token (sin query a la base por request, la mejora de latencia buscada). `authService.functions.ts` (`bootstrapFn`, `createOrganizationFn`, etc.) reemplaza el trigger `handle_new_user` + RPC `create_organization`. Verificado end-to-end contra el emulador local de Firebase Auth: signup → bootstrap → onboarding → logout → login.
- [x] **Sección 3** — Repositories para el resto de las entidades (`src/repositories/`), todos filtrando por `organizationId`. Regla de ESLint que prohíbe `@prisma/client` fuera de ahí. Test de integración (`tests/unit/orgScoping.test.ts`) contra el Postgres local, sin mockear Prisma.
- [x] **Sección 4** — Las 6 pantallas que todavía llamaban a `supabase.from(...)` directo desde el browser (productos, escenarios, sustentabilidad, clientes, dashboard, configuración) pasan a usar server functions autenticados. Verificado en el navegador (no solo tests): el bug que disparó toda la migración (`scenario_feedback` con `PGRST205` contra el proyecto de Supabase equivocado) queda resuelto.
- [x] **Sección 5** — `@supabase/supabase-js` sacado de `package.json`, `src/integrations/supabase/**` eliminado, `.env.example` creado (no existía), `CLAUDE.md` actualizado (stack, regla de repositories, tabla de recursos).
- [x] **Sección 6 (lo que se puede hacer en este entorno)** — `tests/unit/orgScoping.test.ts` (guard de organización) y `tests/unit/bootstrap.test.ts` (idempotencia) contra el Postgres local; `bun run lint && bun run test` en verde en cada sección; flujo manual completo verificado en el navegador (signup → bootstrap → onboarding → generar/aprobar/rechazar en las 3 pantallas de IA → clientes → configuración → dashboard).
- [ ] **Checklist manual del usuario (deploy real)** — sin hacer todavía, requiere consola de Google: instancia real de Cloud SQL, Identity Platform habilitado, service account, env vars nuevas en Vercel, pausar (no borrar) el proyecto de Supabase viejo por 30 días de rollback.

Mientras el checklist manual no esté hecho, la app solo corre contra el stack local (Postgres de `docker-compose.yml` + emulador de Firebase Auth) — no hay despliegue real a Cloud SQL/Identity Platform todavía.

## Decisiones pendientes
- ~~Proveedor LLM inicial~~ → resuelto: Vertex AI (Gemini) como proveedor por defecto (`AI_PROVIDER=vertex`) para Escenarios, con `AI_PROVIDER=mock` disponible para desarrollo sin credenciales.
- ¿Servicio Python separado para ML clásico o todo en BigQuery ML?
- Nombre definitivo y dominio.
