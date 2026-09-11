# Trivium AI

Prompt principal

Build a B2B SaaS web app in Spanish called "Trivium AI" — a generative AI platform for organizations, with three core modules ("pilares"). Use React + TypeScript + Tailwind, clean modern design (dark sidebar, light content area, indigo as primary color). Include Supabase for auth (email/password) and database.




Global layout:




Left sidebar with navigation: Dashboard, Escenarios Futuros, Generador de Productos, Sustentabilidad, Configuración.

Top bar with organization name, user avatar, and notifications icon.

Dashboard home: summary cards for each module (last scenario generated, proposals sent, active sustainability initiatives) plus a recent-activity feed.




Module 1 — Escenarios Futuros (decision-making scenarios):




Form to define an analysis: name, current situation (textarea), asset/portfolio composition (dynamic table: asset name, type [acción/derivado/producto/servicio], current value, weight %), and key independent variables (name, probability slider 0–100%, impact [alto/medio/bajo]).

"Generar escenarios" button that produces 3 scenario cards: Optimista, Esperado, Pesimista. Each card shows: expected return (%), portfolio risk (low/medium/high with a gauge), probability, narrative explanation, and the key variables that drive it. Use mocked data for now, structured so an API can replace it later (a generateScenarios(input): Scenario[] service file).

Comparison view: bar chart of expected returns and risk per scenario (use Recharts).

History list of past analyses with status.




Module 2 — Generador de Productos y Servicios:




Two tabs:

"Propuestas automáticas": table of AI-generated product/service proposals (name, description, target client, channel [Email / LinkedIn / WhatsApp], schedule [semanal/mensual], status [borrador/programada/enviada]). Buttons to approve, edit, pause. A settings panel for cadence and channels per client segment.

"Co-creación": interactive builder where an end user creates their own product. Left panel: form (category, needs, budget). Right panel: AI recommendations based on "previous consumption" (mocked purchase history shown as chips the user can toggle). A "Generar recomendación" button returns 3 suggested product configurations with rationale.

Clients section: simple CRM table (name, email, LinkedIn, WhatsApp, segment, consumption history).




Module 3 — Sustentabilidad:




Form to describe organization resources (materials, capacities, waste streams, workforce).

"Generar propuestas" returns initiative cards, each with: title, sustainability scope tags (social, cultural, medio ambiente, ecosistema, reutilización, sectores desfavorecidos, mundo animal, mundo vegetal), a measurable goal (meta), an action plan (3–6 steps with dates), and 3–5 KPIs with target values and current values (progress bars).

Kanban board of initiatives: Propuesta → En ejecución → Completada.

KPI dashboard: chart of KPI progress across initiatives.




Data & architecture requirements:




All AI outputs mocked but returned from service functions in src/services/ (scenariosService.ts, productsService.ts, sustainabilityService.ts) so they can later call a real backend at /api/*.

Supabase tables: organizations, users, analyses, scenarios, clients, proposals, initiatives, kpis.

Role-based views: admin (all modules) and cliente final (only Co-creación).

Responsive, accessible, all UI text in Spanish.








Prompts de refinamiento (uno por vez)

"Agregá validación a todos los formularios y estados de carga (skeletons) al generar escenarios, propuestas e iniciativas."

"En Escenarios, agregá exportar a PDF el análisis con los 3 escenarios."

"En Propuestas automáticas, agregá vista previa del mensaje por canal (email, LinkedIn, WhatsApp) con plantilla editable."

"En Sustentabilidad, permití editar KPIs y registrar mediciones con fecha; actualizá los progress bars."

"Agregá onboarding de 3 pasos para nuevas organizaciones: datos de la empresa, carga de recursos, invitar usuarios."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/06787830-27e3-4cf8-bc3c-39bc2f6378ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
