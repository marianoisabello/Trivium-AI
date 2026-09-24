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

Pendiente de credenciales reales para probar de punta a punta: `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `VERTEX_AI_MODEL` (y opcional `VERTEX_AI_LOCATION`, default `us-central1`), `MARKET_DATA_API_KEY`. Sin ellas, `AI_PROVIDER=vertex` (default) falla en runtime con un error claro; usar `AI_PROVIDER=mock` para desarrollo local sin credenciales de Google.

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
- [ ] Feedback loop: aprobaciones/rechazos de propuestas y escenarios alimentan el prompt/modelo (RL simple: re-ranking por historial).
- [ ] Observabilidad (logs de llamadas IA, costos por proveedor), rate limiting, RLS en Supabase.
- [ ] Comparar costos Google vs. externos con datos reales de uso y fijar proveedor por función.

## Decisiones pendientes
- ~~Proveedor LLM inicial~~ → resuelto: Vertex AI (Gemini) como proveedor por defecto (`AI_PROVIDER=vertex`) para Escenarios, con `AI_PROVIDER=mock` disponible para desarrollo sin credenciales.
- ¿Servicio Python separado para ML clásico o todo en BigQuery ML?
- Nombre definitivo y dominio.
