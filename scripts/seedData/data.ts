/**
 * Datos demo determinísticos para las 7 organizaciones ficticias.
 *
 * Fuentes que informan los valores (no se copian filas, solo rangos y
 * distribuciones plausibles):
 * - UCI Online Retail II (CC BY 4.0, https://archive.ics.uci.edu/dataset/502):
 *   patrones de consumo mayorista (frecuencia, canastas de 3-8 ítems,
 *   concentración en pocos productos) usados para `Client.consumption`.
 * - Our World in Data CO2 + Energy (CC BY 4.0, github.com/owid/co2-data):
 *   órdenes de magnitud de KPIs de sustentabilidad (intensidad energética,
 *   % renovables, residuos) usados en los targets de iniciativas.
 * Si se quieren regenerar parámetros desde los datasets reales:
 * `scripts/seedData/distill.ts` (requiere descargar los archivos a mano).
 *
 * Todo contacto es ficticio: emails @example.com, teléfonos +54 9 11 5555-0xxx
 * (rango reservado), linkedin bajo linkedin.example.com. NUNCA datos reales.
 */

export interface DemoAssetSpec {
  name: string;
  type: "acción" | "derivado" | "producto" | "servicio";
  value: number;
  weight: number; // los pesos de cada análisis suman 100
}

export interface DemoVariableSpec {
  name: string;
  probability: number; // 0-100
  impact: "alto" | "medio" | "bajo";
}

export interface DemoAnalysisSpec {
  name: string;
  currentSituation: string;
  assets: DemoAssetSpec[];
  variables: DemoVariableSpec[];
}

export interface DemoProposalSpec {
  name: string;
  description: string;
  targetClient: string;
  channel: "Email" | "LinkedIn" | "WhatsApp";
  schedule: "semanal" | "mensual";
  /** true => se registra feedback "aprobado" (la aprobación se modela como feedback, el status queda "borrador"). */
  approved: boolean;
}

export interface DemoKpiSpec {
  name: string;
  unit: string;
  target: number;
  baseline: number; // valor inicial, las mediciones interpolan baseline -> progreso parcial
}

export interface DemoInitiativeSpec {
  title: string;
  scopes: string[];
  goal: string;
  plan: { step: string; date: string }[];
  kpis: DemoKpiSpec[];
  status: "propuesta" | "en ejecución" | "completada";
}

export interface DemoOrgSpec {
  slug: string;
  name: string; // sin prefijo [DEMO], se agrega en el seed
  industry: string;
  size: string;
  resources: { materials: string; capacities: string; waste: string; workforce: string };
  users: { uidSuffix: string; email: string; fullName: string; role: "admin" | "cliente" }[];
  segments: string[];
  catalog: string[]; // productos/servicios para consumption de clientes
  clientCount: number; // 8-15
  analyses: DemoAnalysisSpec[];
  proposals: DemoProposalSpec[];
  initiatives: DemoInitiativeSpec[];
}

/** Parámetros de retorno/volatilidad por clase de activo (sintéticos, plausibles; % anual). */
export const ASSET_CLASS_PARAMS: Record<
  DemoAssetSpec["type"],
  { meanReturn: number; volatility: number }
> = {
  acción: { meanReturn: 8, volatility: 18 },
  derivado: { meanReturn: 12, volatility: 35 },
  producto: { meanReturn: 10, volatility: 12 },
  servicio: { meanReturn: 9, volatility: 9 },
};

/** Partes para componer nombres de empresas-cliente ficticias, determinístico por RNG. */
export const CLIENT_NAME_FIRST = [
  "Comercial del Plata",
  "Grupo Mitre",
  "Almacenes Rivera",
  "Distribuciones Callao",
  "Mercado Belgrano",
  "Casa Urquiza",
  "Proveeduría San Telmo",
  "Corralón Sarmiento",
  "Tiendas Alvear",
  "Depósito Lavalle",
  "Suministros Palermo",
  "Bazar Congreso",
  "Ferretería Independencia",
  "Autoservicio Retiro",
  "Mayorista Caballito",
  "Emporio Flores",
  "Abastecedora Boedo",
  "Galpón Chacarita",
] as const;

export const CLIENT_NAME_SUFFIX = ["S.A.", "S.R.L.", "y Cía.", "Hnos.", "Group"] as const;

export const FEEDBACK_REASONS_APPROVE = [
  "Encaja con la demanda que vemos en ese segmento",
  "Margen estimado razonable y rápido de implementar",
  "Lo pidieron dos cuentas grandes este trimestre",
  "Consistente con la estrategia comercial del año",
] as const;

export const FEEDBACK_REASONS_REJECT = [
  "El segmento objetivo no es prioridad este trimestre",
  "Canibalizaría un producto existente",
  "Requiere una inversión logística que hoy no tenemos",
  "La propuesta es demasiado genérica para este cliente",
] as const;

export const DEMO_ORGS: DemoOrgSpec[] = [
  {
    slug: "andina",
    name: "Distribuidora Andina",
    industry: "Distribución mayorista",
    size: "51-200",
    resources: {
      materials: "Depósito central de 4.500 m², flota de 12 camiones, stock multirrubro",
      capacities: "Logística de última milla propia, picking B2B, cross-docking",
      waste: "Cartón y film de embalaje (~3 tn/mes), pallets rotos",
      workforce: "140 empleados: 60 depósito, 35 reparto, 25 comercial, 20 administración",
    },
    users: [
      {
        uidSuffix: "andina-admin",
        email: "admin@demo-andina.example.com",
        fullName: "Marina Quiroga",
        role: "admin",
      },
      {
        uidSuffix: "andina-cliente",
        email: "cliente@demo-andina.example.com",
        fullName: "Pablo Iriarte",
        role: "cliente",
      },
    ],
    segments: ["Kioscos y autoservicios", "Supermercados regionales", "Gastronomía"],
    catalog: [
      "Pack bebidas sin alcohol x24",
      "Caja snacks surtidos",
      "Aceite girasol 5L",
      "Harina 000 bolsa 25kg",
      "Papel higiénico institucional x48",
      "Detergente concentrado 5L",
      "Yerba mate 1kg x10",
      "Arroz largo fino 10kg",
      "Galletitas surtidas caja 5kg",
      "Café torrado 1kg x6",
    ],
    clientCount: 14,
    analyses: [
      {
        name: "Cartera 2027 — expansión a frescos",
        currentSituation:
          "Facturación estable con margen comprimido por logística. Evaluamos sumar cadena de frío para frescos, financiada parcialmente con la cartera de inversiones.",
        assets: [
          {
            name: "Acciones sector consumo (ETF local)",
            type: "acción",
            value: 120000,
            weight: 30,
          },
          { name: "Futuros de tipo de cambio", type: "derivado", value: 40000, weight: 10 },
          { name: "Línea mayorista seca", type: "producto", value: 180000, weight: 40 },
          { name: "Servicio de logística a terceros", type: "servicio", value: 80000, weight: 20 },
        ],
        variables: [
          { name: "Inflación anual por debajo del 20%", probability: 45, impact: "alto" },
          {
            name: "Apertura de 2 centros de distribución competidores",
            probability: 30,
            impact: "medio",
          },
          { name: "Demanda de frescos crece 15%", probability: 60, impact: "alto" },
        ],
      },
      {
        name: "Escenarios de renovación de flota",
        currentSituation:
          "La flota promedia 9 años; el costo de mantenimiento subió 22% interanual. Comparamos renovar con leasing contra sostener mantenimiento.",
        assets: [
          { name: "Flota actual (valor residual)", type: "producto", value: 95000, weight: 35 },
          { name: "Leasing unidades nuevas", type: "servicio", value: 110000, weight: 40 },
          {
            name: "Cobertura de combustible (futuros)",
            type: "derivado",
            value: 25000,
            weight: 10,
          },
          { name: "Acciones proveedor logístico", type: "acción", value: 42000, weight: 15 },
        ],
        variables: [
          { name: "Suba del gasoil mayor al 25%", probability: 55, impact: "alto" },
          { name: "Tasa de leasing baja 3 puntos", probability: 35, impact: "medio" },
          { name: "Nueva normativa de emisiones para flotas", probability: 40, impact: "bajo" },
        ],
      },
    ],
    proposals: [
      {
        name: "Canasta frescos para gastronomía",
        description:
          "Combo semanal de frescos y secos para restaurantes, armado según el historial de pedidos de cada cuenta.",
        targetClient: "Gastronomía",
        channel: "Email",
        schedule: "semanal",
        approved: true,
      },
      {
        name: "Programa de recompra de pallets",
        description:
          "Servicio de retiro y acreditación de pallets en la siguiente compra, reduciendo costo logístico del cliente.",
        targetClient: "Supermercados regionales",
        channel: "Email",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Suscripción kiosco inteligente",
        description:
          "Reposición automática quincenal de los 20 SKUs de mayor rotación del kiosco, con precio congelado por 60 días.",
        targetClient: "Kioscos y autoservicios",
        channel: "WhatsApp",
        schedule: "semanal",
        approved: false,
      },
      {
        name: "Marca propia de limpieza institucional",
        description:
          "Línea de limpieza con marca de la distribuidora para gastronomía y supermercados, margen estimado +8pp.",
        targetClient: "Gastronomía",
        channel: "LinkedIn",
        schedule: "mensual",
        approved: false,
      },
      {
        name: "Crédito a 30 días para autoservicios",
        description: "Cuenta corriente con tope dinámico según historial de pago del cliente.",
        targetClient: "Kioscos y autoservicios",
        channel: "Email",
        schedule: "mensual",
        approved: false,
      },
    ],
    initiatives: [
      {
        title: "Logística de retorno de embalajes",
        scopes: ["reutilización", "medio ambiente"],
        goal: "Recuperar el 60% del cartón y film entregado a clientes antes de diciembre 2027",
        plan: [
          { step: "Censo de volumen de embalaje por ruta de reparto", date: "2026-11-15" },
          { step: "Acuerdo con cooperativa de reciclado local", date: "2027-02-01" },
          { step: "Retiro en reparto habitual en el 50% de las rutas", date: "2027-06-30" },
          { step: "Cobertura total de rutas y reporte público", date: "2027-12-15" },
        ],
        kpis: [
          { name: "Cartón recuperado", unit: "tn/mes", target: 1.8, baseline: 0.2 },
          { name: "Rutas con retiro activo", unit: "%", target: 100, baseline: 0 },
          { name: "Costo de embalaje nuevo", unit: "% vs 2026", target: -25, baseline: 0 },
        ],
        status: "en ejecución",
      },
      {
        title: "Primer empleo en depósito",
        scopes: ["social", "sectores desfavorecidos"],
        goal: "Incorporar 12 jóvenes de barrios vulnerables con contrato formal y mentoría en 18 meses",
        plan: [
          { step: "Convenio con ONG de empleo joven", date: "2026-12-01" },
          { step: "Primera cohorte de 4 ingresos", date: "2027-03-01" },
          { step: "Programa de mentoría interna", date: "2027-04-15" },
          { step: "Segunda y tercera cohorte", date: "2027-10-01" },
        ],
        kpis: [
          { name: "Jóvenes incorporados", unit: "personas", target: 12, baseline: 0 },
          { name: "Retención a 6 meses", unit: "%", target: 75, baseline: 0 },
          { name: "Horas de mentoría", unit: "hs/mes", target: 40, baseline: 0 },
        ],
        status: "propuesta",
      },
    ],
  },
  {
    slug: "tecnosur",
    name: "TecnoSur Software",
    industry: "Software B2B",
    size: "11-50",
    resources: {
      materials: "Infraestructura cloud, 3 productos SaaS en producción",
      capacities: "Equipo de desarrollo full-stack, soporte 24/5, integraciones con ERPs",
      waste: "Equipos informáticos obsoletos (~15 unidades/año)",
      workforce: "38 empleados: 24 ingeniería, 8 comercial, 6 administración",
    },
    users: [
      {
        uidSuffix: "tecnosur-admin",
        email: "admin@demo-tecnosur.example.com",
        fullName: "Federico Lescano",
        role: "admin",
      },
    ],
    segments: ["PyMEs industriales", "Estudios contables", "Retail"],
    catalog: [
      "Licencia ERP Nube plan Pro",
      "Módulo facturación electrónica",
      "Módulo gestión de stock",
      "Integración e-commerce",
      "Soporte premium 24/7",
      "Capacitación onboarding",
      "API de reportes",
      "Módulo RRHH y liquidación",
    ],
    clientCount: 11,
    analyses: [
      {
        name: "Mix de ingresos 2027 — licencias vs servicios",
        currentSituation:
          "El 70% del ingreso es licencia recurrente y 30% servicios. Evaluamos invertir reservas en un cuarto producto o en acciones del sector.",
        assets: [
          { name: "Acciones tecnológicas (CEDEARs)", type: "acción", value: 60000, weight: 20 },
          { name: "Suite ERP (ARR)", type: "producto", value: 150000, weight: 50 },
          { name: "Servicios profesionales", type: "servicio", value: 70000, weight: 25 },
          { name: "Opciones sobre índice tech", type: "derivado", value: 15000, weight: 5 },
        ],
        variables: [
          { name: "Churn anual se mantiene debajo del 8%", probability: 65, impact: "alto" },
          { name: "Competidor internacional baja precios 20%", probability: 35, impact: "alto" },
          {
            name: "Normativa de factura electrónica se extiende a monotributo",
            probability: 70,
            impact: "medio",
          },
        ],
      },
      {
        name: "Expansión regional — Uruguay y Paraguay",
        currentSituation:
          "Demanda inbound de 14 leads regionales sin presencia local. Comparamos partner local contra filial propia.",
        assets: [
          { name: "Inversión filial propia", type: "servicio", value: 90000, weight: 45 },
          { name: "Modelo partner (revenue share)", type: "servicio", value: 50000, weight: 30 },
          { name: "Acciones de reserva", type: "acción", value: 35000, weight: 20 },
          { name: "Cobertura cambiaria", type: "derivado", value: 10000, weight: 5 },
        ],
        variables: [
          {
            name: "Cierre de 5+ clientes regionales el primer año",
            probability: 50,
            impact: "alto",
          },
          { name: "Costo salarial regional sube 15%", probability: 40, impact: "medio" },
          { name: "Partner exige exclusividad", probability: 55, impact: "bajo" },
        ],
      },
    ],
    proposals: [
      {
        name: "Plan contadores multiempresa",
        description:
          "Licencia por cartera para estudios contables: hasta 50 empresas cliente con tablero consolidado.",
        targetClient: "Estudios contables",
        channel: "LinkedIn",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Módulo trazabilidad industrial",
        description:
          "Extensión del módulo de stock con lotes, vencimientos y órdenes de fabricación para PyMEs industriales.",
        targetClient: "PyMEs industriales",
        channel: "Email",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Pack retail omnicanal",
        description:
          "Bundle integración e-commerce + stock + reportes con onboarding incluido para cadenas chicas.",
        targetClient: "Retail",
        channel: "Email",
        schedule: "semanal",
        approved: false,
      },
      {
        name: "Programa de referidos con créditos",
        description: "Créditos de licencia por cada cliente referido que active un plan anual.",
        targetClient: "PyMEs industriales",
        channel: "WhatsApp",
        schedule: "mensual",
        approved: false,
      },
    ],
    initiatives: [
      {
        title: "Donación y reacondicionamiento de equipos",
        scopes: ["reutilización", "sectores desfavorecidos", "social"],
        goal: "Reacondicionar y donar el 100% de los equipos dados de baja (≥15/año) a escuelas técnicas",
        plan: [
          { step: "Inventario de equipos y convenio con 2 escuelas", date: "2026-12-10" },
          { step: "Primera entrega de 8 equipos reacondicionados", date: "2027-03-20" },
          { step: "Taller de armado de PCs con alumnos", date: "2027-05-15" },
        ],
        kpis: [
          { name: "Equipos donados", unit: "unidades/año", target: 15, baseline: 0 },
          { name: "Escuelas alcanzadas", unit: "escuelas", target: 4, baseline: 0 },
          { name: "Residuo electrónico a disposición final", unit: "%", target: 0, baseline: 100 },
        ],
        status: "en ejecución",
      },
      {
        title: "Medición y compensación de huella cloud",
        scopes: ["medio ambiente"],
        goal: "Medir la huella de carbono de la infraestructura cloud y reducirla 30% por cliente activo para 2028",
        plan: [
          { step: "Baseline de consumo por servicio (kWh y kgCO2e)", date: "2027-02-01" },
          { step: "Migración de workloads a regiones con energía renovable", date: "2027-07-01" },
          { step: "Reporte anual público de huella", date: "2027-12-01" },
        ],
        kpis: [
          { name: "Intensidad de carbono", unit: "kgCO2e/cliente-mes", target: 2.1, baseline: 3.0 },
          { name: "Workloads en regiones renovables", unit: "%", target: 80, baseline: 25 },
          { name: "Consumo energético estimado", unit: "MWh/año", target: 38, baseline: 46 },
        ],
        status: "propuesta",
      },
    ],
  },
  {
    slug: "agropampa",
    name: "AgroPampa",
    industry: "Agroindustria",
    size: "201-500",
    resources: {
      materials: "6.200 ha agrícolas, planta de acopio, silos por 40.000 tn",
      capacities: "Siembra directa, monitoreo satelital, acopio y acondicionamiento a terceros",
      waste: "Rastrojo, silobolsas usadas (~8 tn/año), efluentes de lavado",
      workforce: "230 empleados entre campo, planta y administración",
    },
    users: [
      {
        uidSuffix: "agropampa-admin",
        email: "admin@demo-agropampa.example.com",
        fullName: "Lucía Etcheverry",
        role: "admin",
      },
      {
        uidSuffix: "agropampa-cliente",
        email: "cliente@demo-agropampa.example.com",
        fullName: "Ramiro Olazábal",
        role: "cliente",
      },
    ],
    segments: ["Acopiadores", "Exportadores", "Productores vecinos"],
    catalog: [
      "Soja disponible (tn)",
      "Maíz disponible (tn)",
      "Trigo disponible (tn)",
      "Servicio de acopio (tn/mes)",
      "Acondicionamiento y secado",
      "Flete corto a puerto",
      "Semilla fiscalizada de trigo",
      "Asesoramiento agronómico",
    ],
    clientCount: 12,
    analyses: [
      {
        name: "Campaña 2026/27 — mix soja/maíz/trigo",
        currentSituation:
          "Humedad de perfil buena, relación insumo/producto favorable al maíz. Definimos mix de siembra y cobertura de precios.",
        assets: [
          {
            name: "Soja (posición física proyectada)",
            type: "producto",
            value: 320000,
            weight: 35,
          },
          {
            name: "Maíz (posición física proyectada)",
            type: "producto",
            value: 280000,
            weight: 30,
          },
          { name: "Futuros y opciones (coberturas)", type: "derivado", value: 120000, weight: 15 },
          { name: "Servicio de acopio a terceros", type: "servicio", value: 90000, weight: 10 },
          { name: "Acciones agroexportadoras", type: "acción", value: 85000, weight: 10 },
        ],
        variables: [
          { name: "Niña débil (lluvias 15% bajo lo normal)", probability: 45, impact: "alto" },
          { name: "Retenciones sin cambios hasta cosecha", probability: 60, impact: "alto" },
          { name: "Precio maíz Chicago sube 10%+", probability: 35, impact: "medio" },
        ],
      },
      {
        name: "Inversión en planta de secado",
        currentSituation:
          "El secado tercerizado cuesta 4,2 USD/tn. Una secadora propia amortizaría en 4 campañas si el volumen de acopio crece 20%.",
        assets: [
          { name: "Secadora nueva (CAPEX)", type: "producto", value: 240000, weight: 50 },
          { name: "Acopio a terceros ampliado", type: "servicio", value: 130000, weight: 30 },
          { name: "Cobertura de tasa (swap)", type: "derivado", value: 40000, weight: 10 },
          { name: "Acciones de reserva", type: "acción", value: 45000, weight: 10 },
        ],
        variables: [
          { name: "Volumen de acopio crece 20%", probability: 55, impact: "alto" },
          { name: "Tarifa eléctrica rural sube 30%", probability: 40, impact: "medio" },
          { name: "Crédito a tasa subsidiada disponible", probability: 50, impact: "alto" },
        ],
      },
    ],
    proposals: [
      {
        name: "Acopio + cobertura llave en mano",
        description:
          "Para productores vecinos: acopio, secado y cobertura de precio mínima garantizada en un solo contrato.",
        targetClient: "Productores vecinos",
        channel: "WhatsApp",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Trigo con identidad preservada",
        description:
          "Lotes segregados de trigo con proteína certificada para exportadores que pagan prima de calidad.",
        targetClient: "Exportadores",
        channel: "Email",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Semilla + asesoramiento como suscripción",
        description: "Paquete anual de semilla fiscalizada más 4 visitas agronómicas por campaña.",
        targetClient: "Productores vecinos",
        channel: "Email",
        schedule: "mensual",
        approved: false,
      },
      {
        name: "Flete nocturno a puerto en cosecha",
        description: "Turnos nocturnos de flete corto para descomprimir la fila de cosecha.",
        targetClient: "Acopiadores",
        channel: "WhatsApp",
        schedule: "semanal",
        approved: false,
      },
    ],
    initiatives: [
      {
        title: "Reciclado de silobolsas y bidones",
        scopes: ["medio ambiente", "reutilización", "ecosistema"],
        goal: "Reciclar el 90% de silobolsas y bidones de fitosanitarios usados en la campaña 2027",
        plan: [
          { step: "Punto de acopio habilitado en planta", date: "2026-12-15" },
          { step: "Convenio con recicladora de polietileno", date: "2027-02-28" },
          { step: "Campaña con productores vecinos para sumar sus envases", date: "2027-05-01" },
        ],
        kpis: [
          { name: "Silobolsas recicladas", unit: "tn/año", target: 7.2, baseline: 1.5 },
          { name: "Bidones con triple lavado entregados", unit: "%", target: 90, baseline: 35 },
          { name: "Productores vecinos adheridos", unit: "productores", target: 25, baseline: 0 },
        ],
        status: "en ejecución",
      },
      {
        title: "Corredores de biodiversidad en bordes de lote",
        scopes: ["ecosistema", "mundo animal", "mundo vegetal"],
        goal: "Implantar 45 km de corredores de vegetación nativa en bordes de lote para 2028",
        plan: [
          { step: "Relevamiento de bordes aptos con INTA", date: "2027-03-01" },
          { step: "Siembra de nativas en primeros 15 km", date: "2027-09-15" },
          { step: "Monitoreo de polinizadores y aves", date: "2028-02-28" },
        ],
        kpis: [
          { name: "Corredores implantados", unit: "km", target: 45, baseline: 0 },
          { name: "Especies de aves relevadas", unit: "especies", target: 60, baseline: 38 },
          { name: "Superficie con nativas", unit: "ha", target: 90, baseline: 12 },
        ],
        status: "propuesta",
      },
    ],
  },
  {
    slug: "lumina",
    name: "Lumina Energía",
    industry: "Energía renovable",
    size: "51-200",
    resources: {
      materials:
        "Parque solar de 18 MW, 2 cuadrillas de instalación, stock de paneles e inversores",
      capacities: "Generación distribuida, instalación comercial e industrial, O&M de parques",
      waste: "Paneles dañados en instalación (~40/año), embalajes, scrap de cableado",
      workforce: "95 empleados: 50 técnica, 25 ingeniería, 20 comercial/administración",
    },
    users: [
      {
        uidSuffix: "lumina-admin",
        email: "admin@demo-lumina.example.com",
        fullName: "Carolina Funes",
        role: "admin",
      },
    ],
    segments: ["Industrias electrointensivas", "Agro y frío", "Comercios grandes"],
    catalog: [
      "Instalación solar on-grid 100kW",
      "Instalación solar on-grid 500kW",
      "PPA a 10 años (MWh)",
      "Mantenimiento O&M anual",
      "Baterías de respaldo industrial",
      "Auditoría energética",
      "Monitoreo remoto de planta",
      "Carport solar estacionamiento",
    ],
    clientCount: 9,
    analyses: [
      {
        name: "Ampliación del parque a 30 MW",
        currentSituation:
          "El parque opera a factor de capacidad 24%. Hay demanda de PPAs corporativos por 15 MW adicionales. Evaluamos financiamiento mixto.",
        assets: [
          { name: "Parque solar actual (flujo PPA)", type: "producto", value: 450000, weight: 45 },
          { name: "Ampliación 12 MW (CAPEX)", type: "producto", value: 300000, weight: 30 },
          { name: "Contratos PPA nuevos", type: "servicio", value: 150000, weight: 15 },
          { name: "Cobertura de tasa en USD", type: "derivado", value: 50000, weight: 5 },
          { name: "Acciones sector energía", type: "acción", value: 48000, weight: 5 },
        ],
        variables: [
          { name: "Precio mayorista de energía sube 12%+", probability: 50, impact: "alto" },
          { name: "Arancel a paneles importados", probability: 30, impact: "alto" },
          { name: "Nuevos PPAs corporativos por 10+ MW firmados", probability: 55, impact: "alto" },
        ],
      },
      {
        name: "Línea de baterías industriales",
        currentSituation:
          "Cortes de red crecientes en parques industriales generan demanda de respaldo. Margen alto pero capital de trabajo intensivo.",
        assets: [
          { name: "Stock inicial de baterías", type: "producto", value: 140000, weight: 40 },
          { name: "Servicio de integración y O&M", type: "servicio", value: 100000, weight: 35 },
          { name: "Cobertura cambiaria importación", type: "derivado", value: 35000, weight: 10 },
          { name: "Acciones proveedores de litio", type: "acción", value: 45000, weight: 15 },
        ],
        variables: [
          {
            name: "Precio de baterías baja 15% (sobreoferta global)",
            probability: 45,
            impact: "alto",
          },
          { name: "Normativa exige respaldo en frío industrial", probability: 25, impact: "medio" },
          { name: "Competidor local lanza financiamiento 0%", probability: 35, impact: "medio" },
        ],
      },
    ],
    proposals: [
      {
        name: "PPA flexible para frío agroindustrial",
        description:
          "Contrato de energía con curva estacional adaptada a frigoríficos y empaque, con cláusula de expansión.",
        targetClient: "Agro y frío",
        channel: "LinkedIn",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Solar + batería como servicio",
        description:
          "Instalación sin CAPEX del cliente: fee mensual por energía + respaldo, contrato a 7 años.",
        targetClient: "Industrias electrointensivas",
        channel: "Email",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Carport solar con publicidad",
        description:
          "Carports en estacionamientos de comercios grandes, cofinanciados con espacio publicitario.",
        targetClient: "Comercios grandes",
        channel: "Email",
        schedule: "mensual",
        approved: false,
      },
      {
        name: "Auditoría energética gratuita Q1",
        description: "Campaña de auditorías sin costo para generar pipeline de instalaciones.",
        targetClient: "Comercios grandes",
        channel: "WhatsApp",
        schedule: "semanal",
        approved: false,
      },
    ],
    initiatives: [
      {
        title: "Segunda vida de paneles dañados",
        scopes: ["reutilización", "medio ambiente", "sectores desfavorecidos"],
        goal: "Reacondicionar el 70% de paneles dañados y destinarlos a electrificación rural comunitaria en 2027",
        plan: [
          { step: "Protocolo de testeo y reclasificación de paneles", date: "2026-12-01" },
          { step: "Alianza con cooperativa eléctrica rural", date: "2027-03-15" },
          { step: "Primera instalación comunitaria (escuela rural)", date: "2027-06-30" },
        ],
        kpis: [
          { name: "Paneles reacondicionados", unit: "unidades/año", target: 28, baseline: 0 },
          { name: "Hogares/instituciones electrificados", unit: "sitios", target: 6, baseline: 0 },
          { name: "Residuo de paneles a disposición", unit: "%", target: 30, baseline: 100 },
        ],
        status: "en ejecución",
      },
      {
        title: "Pastoreo regenerativo bajo paneles",
        scopes: ["ecosistema", "mundo animal", "mundo vegetal"],
        goal: "Implementar manejo ovino rotativo en el 100% del parque para control vegetal sin herbicidas en 2027",
        plan: [
          { step: "Piloto con 80 ovejas en 4 ha", date: "2027-01-20" },
          { step: "Medición de cobertura vegetal y suelo", date: "2027-05-20" },
          { step: "Extensión a todo el parque", date: "2027-10-01" },
        ],
        kpis: [
          { name: "Superficie bajo pastoreo", unit: "%", target: 100, baseline: 15 },
          { name: "Uso de herbicidas", unit: "L/año", target: 0, baseline: 420 },
          { name: "Cobertura vegetal viva", unit: "%", target: 85, baseline: 60 },
        ],
        status: "propuesta",
      },
    ],
  },
  {
    slug: "textil",
    name: "Textil Del Valle",
    industry: "Manufactura textil",
    size: "201-500",
    resources: {
      materials: "Planta de tejeduría y confección, 85 máquinas, stock de hilados de algodón",
      capacities:
        "Tejido de punto, corte automatizado, confección 45.000 prendas/mes, teñido tercerizado",
      waste: "Retazos y recortes (~6 tn/mes), conos de hilado, agua de proceso",
      workforce: "310 empleados, 70% mujeres, 3 turnos",
    },
    users: [
      {
        uidSuffix: "textil-admin",
        email: "admin@demo-textil.example.com",
        fullName: "Verónica Páez",
        role: "admin",
      },
      {
        uidSuffix: "textil-cliente",
        email: "cliente@demo-textil.example.com",
        fullName: "Hernán Bulacio",
        role: "cliente",
      },
    ],
    segments: ["Marcas de indumentaria", "Uniformes corporativos", "Mayoristas textiles"],
    catalog: [
      "Remera básica algodón (docena)",
      "Buzo frisa (docena)",
      "Chomba piqué bordada (docena)",
      "Uniforme industrial set",
      "Tela de punto por rollo",
      "Servicio de corte a façon",
      "Confección a façon (prenda)",
      "Desarrollo de muestra",
    ],
    clientCount: 13,
    analyses: [
      {
        name: "Integrar teñido propio",
        currentSituation:
          "El teñido tercerizado genera cuellos de botella de 12 días. Una planta propia reduce lead time pero exige tratamiento de efluentes.",
        assets: [
          { name: "Planta de teñido (CAPEX)", type: "producto", value: 380000, weight: 45 },
          { name: "Producción actual a façon", type: "servicio", value: 220000, weight: 30 },
          { name: "Cobertura precio algodón", type: "derivado", value: 60000, weight: 10 },
          { name: "Acciones sector consumo", type: "acción", value: 110000, weight: 15 },
        ],
        variables: [
          { name: "Precio del algodón sube 20%+", probability: 40, impact: "alto" },
          { name: "Importación de prendas crece 25%", probability: 50, impact: "alto" },
          { name: "Crédito productivo a tasa subsidiada", probability: 45, impact: "medio" },
        ],
      },
      {
        name: "Mix marcas propias vs façon 2027",
        currentSituation:
          "El façon da volumen estable con margen 8%; la línea propia margen 22% pero demanda capital de trabajo y riesgo de stock.",
        assets: [
          { name: "Línea propia (colección)", type: "producto", value: 160000, weight: 35 },
          { name: "Contratos façon anuales", type: "servicio", value: 200000, weight: 45 },
          { name: "Acciones de reserva", type: "acción", value: 65000, weight: 15 },
          { name: "Futuros de tipo de cambio", type: "derivado", value: 20000, weight: 5 },
        ],
        variables: [
          { name: "Consumo interno de indumentaria cae 10%", probability: 45, impact: "alto" },
          { name: "Cliente ancla de façon renueva contrato", probability: 70, impact: "alto" },
          { name: "Apertura de canal e-commerce propio exitosa", probability: 40, impact: "medio" },
        ],
      },
    ],
    proposals: [
      {
        name: "Uniformes con trazabilidad sustentable",
        description:
          "Línea de uniformes corporativos con algodón certificado y etiqueta de huella por prenda.",
        targetClient: "Uniformes corporativos",
        channel: "LinkedIn",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Mini-colecciones cápsula a façon",
        description:
          "Series cortas (300-800 prendas) con desarrollo de muestra en 10 días para marcas emergentes.",
        targetClient: "Marcas de indumentaria",
        channel: "Email",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Tela de punto por suscripción",
        description: "Entrega mensual de rollos con precio indexado y prioridad de máquina.",
        targetClient: "Mayoristas textiles",
        channel: "Email",
        schedule: "mensual",
        approved: false,
      },
      {
        name: "Básicos de reposición continua",
        description:
          "Programa de reposición automática de remeras y buzos básicos según venta del cliente.",
        targetClient: "Mayoristas textiles",
        channel: "WhatsApp",
        schedule: "semanal",
        approved: false,
      },
    ],
    initiatives: [
      {
        title: "Retazo cero: economía circular textil",
        scopes: ["reutilización", "medio ambiente", "sectores desfavorecidos", "social"],
        goal: "Reconvertir el 80% de los retazos (4,8 tn/mes) en nuevos productos o donarlos a cooperativas en 2027",
        plan: [
          { step: "Clasificación de retazos por tipo y tamaño en línea", date: "2026-11-30" },
          {
            step: "Línea de accesorios con retazos grandes (scrunchies, bolsas)",
            date: "2027-03-01",
          },
          { step: "Convenio con 3 cooperativas textiles para retazo medio", date: "2027-05-01" },
          { step: "Relleno reciclado (guata) con retazo chico", date: "2027-09-01" },
        ],
        kpis: [
          { name: "Retazo reconvertido o donado", unit: "tn/mes", target: 4.8, baseline: 0.6 },
          {
            name: "Cooperativas activas en convenio",
            unit: "cooperativas",
            target: 3,
            baseline: 0,
          },
          { name: "Ingreso por línea circular", unit: "USD/mes", target: 6500, baseline: 0 },
          { name: "Retazo a relleno sanitario", unit: "%", target: 20, baseline: 90 },
        ],
        status: "en ejecución",
      },
      {
        title: "Guardería y terminalidad educativa en planta",
        scopes: ["social", "cultural"],
        goal: "Abrir guardería para 40 niños y programa de terminalidad secundaria para 25 empleadas en 2027",
        plan: [
          { step: "Adecuación edilicia del ala norte", date: "2027-02-01" },
          { step: "Apertura de guardería turno mañana", date: "2027-04-01" },
          { step: "Convenio con plan FinEs para secundario", date: "2027-04-15" },
        ],
        kpis: [
          { name: "Niños con vacante activa", unit: "niños", target: 40, baseline: 0 },
          { name: "Empleadas cursando secundario", unit: "personas", target: 25, baseline: 0 },
          { name: "Rotación de personal femenino", unit: "% anual", target: 12, baseline: 21 },
        ],
        status: "propuesta",
      },
    ],
  },
  {
    slug: "logitrack",
    name: "LogiTrack",
    industry: "Logística y transporte",
    size: "51-200",
    resources: {
      materials:
        "Flota de 45 unidades (28 propias), 2 centros de cross-docking, sistema TMS propio",
      capacities: "Distribución regional, última milla urbana, logística de frío parcial",
      waste: "Neumáticos (~90/año), aceite de motor, embalaje de consolidación",
      workforce: "160 empleados: 85 choferes, 40 depósito, 35 operaciones/administración",
    },
    users: [
      {
        uidSuffix: "logitrack-admin",
        email: "admin@demo-logitrack.example.com",
        fullName: "Gonzalo Aramburu",
        role: "admin",
      },
    ],
    segments: ["E-commerce", "Industria alimenticia", "Laboratorios y farma"],
    catalog: [
      "Última milla urbana (envío)",
      "Distribución regional pallet",
      "Cross-docking (posición)",
      "Logística de frío (viaje)",
      "Logística inversa devoluciones",
      "Almacenaje temporal (m²/mes)",
      "Entrega programada con franja",
      "Tracking API para e-commerce",
    ],
    clientCount: 10,
    analyses: [
      {
        name: "Electrificación de última milla",
        currentSituation:
          "El 40% de los viajes son urbanos de <80 km, aptos para utilitarios eléctricos. El combustible es el 31% del costo operativo.",
        assets: [
          {
            name: "10 utilitarios eléctricos (CAPEX)",
            type: "producto",
            value: 280000,
            weight: 40,
          },
          { name: "Flota diésel actual", type: "producto", value: 190000, weight: 30 },
          {
            name: "Contratos última milla e-commerce",
            type: "servicio",
            value: 150000,
            weight: 25,
          },
          { name: "Cobertura de combustible", type: "derivado", value: 30000, weight: 5 },
        ],
        variables: [
          { name: "Precio del gasoil sube 25%+", probability: 50, impact: "alto" },
          { name: "Línea verde de crédito para flota eléctrica", probability: 45, impact: "alto" },
          { name: "Municipio restringe diésel en microcentro", probability: 35, impact: "medio" },
        ],
      },
      {
        name: "Entrada a logística farma",
        currentSituation:
          "Dos laboratorios pidieron cotización de distribución validada. Exige certificación de cadena de frío y trazabilidad por unidad.",
        assets: [
          {
            name: "Certificación + adecuación de frío",
            type: "servicio",
            value: 120000,
            weight: 35,
          },
          { name: "Contratos farma proyectados", type: "servicio", value: 140000, weight: 40 },
          { name: "Acciones de reserva", type: "acción", value: 60000, weight: 20 },
          { name: "Cobertura cambiaria", type: "derivado", value: 15000, weight: 5 },
        ],
        variables: [
          { name: "Certificación ANMAT en menos de 8 meses", probability: 55, impact: "alto" },
          { name: "Competidor especializado baja tarifas 15%", probability: 30, impact: "medio" },
          { name: "Tercer laboratorio se suma al contrato", probability: 40, impact: "alto" },
        ],
      },
    ],
    proposals: [
      {
        name: "Franja horaria premium nocturna",
        description: "Entregas 20-24 hs para e-commerce con tasa de primera entrega efectiva >95%.",
        targetClient: "E-commerce",
        channel: "Email",
        schedule: "semanal",
        approved: true,
      },
      {
        name: "Logística inversa como servicio",
        description:
          "Gestión completa de devoluciones: retiro, clasificación y reingreso a stock del cliente.",
        targetClient: "E-commerce",
        channel: "LinkedIn",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Ruta láctea compartida",
        description:
          "Consolidación de frío de varias PyMEs alimenticias en una misma ruta regional.",
        targetClient: "Industria alimenticia",
        channel: "Email",
        schedule: "mensual",
        approved: false,
      },
      {
        name: "Tracking white-label",
        description: "API y página de seguimiento con marca del cliente para tiendas online.",
        targetClient: "E-commerce",
        channel: "WhatsApp",
        schedule: "mensual",
        approved: false,
      },
    ],
    initiatives: [
      {
        title: "Flota urbana cero emisiones",
        scopes: ["medio ambiente"],
        goal: "Cubrir el 50% de los viajes urbanos con utilitarios eléctricos para fines de 2027",
        plan: [
          { step: "Piloto con 3 utilitarios eléctricos en microcentro", date: "2027-01-15" },
          { step: "Instalación de cargadores en cross-dock sur", date: "2027-04-01" },
          { step: "Ampliación a 10 unidades", date: "2027-10-01" },
        ],
        kpis: [
          { name: "Viajes urbanos eléctricos", unit: "%", target: 50, baseline: 0 },
          { name: "Emisiones de CO2 flota urbana", unit: "tnCO2e/año", target: 95, baseline: 180 },
          { name: "Costo por km urbano", unit: "USD/km", target: 0.34, baseline: 0.52 },
        ],
        status: "en ejecución",
      },
      {
        title: "Reencauchado y reciclaje de neumáticos",
        scopes: ["reutilización", "medio ambiente"],
        goal: "Reencauchar el 60% de los neumáticos de la flota y reciclar el 100% de los no reutilizables en 2027",
        plan: [
          { step: "Auditoría de desgaste y política de rotación", date: "2026-12-20" },
          { step: "Contrato con planta de reencauchado", date: "2027-02-15" },
          { step: "Canal de reciclaje para descarte (GCN)", date: "2027-04-30" },
        ],
        kpis: [
          { name: "Neumáticos reencauchados", unit: "%", target: 60, baseline: 10 },
          { name: "Neumáticos a reciclaje certificado", unit: "%", target: 100, baseline: 20 },
          { name: "Gasto anual en neumáticos", unit: "% vs 2026", target: -30, baseline: 0 },
        ],
        status: "propuesta",
      },
    ],
  },
  {
    slug: "horizonte",
    name: "Clínica Horizonte",
    industry: "Salud privada",
    size: "201-500",
    resources: {
      materials: "Sanatorio de 120 camas, 6 quirófanos, diagnóstico por imágenes propio",
      capacities:
        "Internación clínica y quirúrgica, guardia 24hs, consultorios externos, laboratorio",
      waste: "Residuos patogénicos (~2,5 tn/mes), descartables, equipamiento dado de baja",
      workforce: "420 empleados: 180 enfermería, 95 médicos de planta, 145 soporte",
    },
    users: [
      {
        uidSuffix: "horizonte-admin",
        email: "admin@demo-horizonte.example.com",
        fullName: "Dra. Silvia Brandán",
        role: "admin",
      },
    ],
    segments: ["Obras sociales", "Prepagas", "Pacientes particulares"],
    catalog: [
      "Módulo de internación clínica",
      "Módulo quirúrgico programado",
      "Plan de chequeo ejecutivo",
      "Consulta de especialidad",
      "Diagnóstico por imágenes (estudio)",
      "Laboratorio de rutina (panel)",
      "Telemedicina (consulta)",
      "Hospital de día oncológico",
    ],
    clientCount: 8,
    analyses: [
      {
        name: "Expansión de hospital de día",
        currentSituation:
          "El hospital de día opera al 92% de ocupación con lista de espera. Ampliar 8 puestos libera camas de internación de mayor costo.",
        assets: [
          {
            name: "Ampliación hospital de día (CAPEX)",
            type: "producto",
            value: 260000,
            weight: 40,
          },
          { name: "Convenios con prepagas", type: "servicio", value: 240000, weight: 40 },
          { name: "Acciones sector salud", type: "acción", value: 80000, weight: 15 },
          { name: "Cobertura de tasa", type: "derivado", value: 25000, weight: 5 },
        ],
        variables: [
          {
            name: "Prepagas actualizan aranceles sobre inflación",
            probability: 40,
            impact: "alto",
          },
          { name: "Demanda oncológica ambulatoria crece 12%", probability: 65, impact: "alto" },
          { name: "Falta de enfermería especializada", probability: 50, impact: "medio" },
        ],
      },
      {
        name: "Telemedicina como línea de servicio",
        currentSituation:
          "El 18% de las consultas de seguimiento son telemedicina. Evaluamos plataforma propia contra licencia de terceros.",
        assets: [
          { name: "Plataforma propia (desarrollo)", type: "producto", value: 90000, weight: 30 },
          { name: "Licencia plataforma de terceros", type: "servicio", value: 60000, weight: 20 },
          {
            name: "Consultas telemedicina proyectadas",
            type: "servicio",
            value: 110000,
            weight: 35,
          },
          { name: "Acciones de reserva", type: "acción", value: 45000, weight: 15 },
        ],
        variables: [
          { name: "Nomenclador incluye telemedicina sin tope", probability: 45, impact: "alto" },
          { name: "Adopción de pacientes +60 supera 25%", probability: 40, impact: "medio" },
          {
            name: "Requisitos de historia clínica interoperable",
            probability: 60,
            impact: "medio",
          },
        ],
      },
    ],
    proposals: [
      {
        name: "Chequeo ejecutivo corporativo",
        description:
          "Planes anuales de chequeo para empresas con informe agregado de salud poblacional.",
        targetClient: "Prepagas",
        channel: "LinkedIn",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Seguimiento crónico por telemedicina",
        description:
          "Programa de seguimiento de diabetes e hipertensión con consultas virtuales y alertas.",
        targetClient: "Obras sociales",
        channel: "Email",
        schedule: "mensual",
        approved: true,
      },
      {
        name: "Fast-track quirúrgico particular",
        description:
          "Paquete cerrado de cirugías programadas de baja complejidad con fecha garantizada en 15 días.",
        targetClient: "Pacientes particulares",
        channel: "Email",
        schedule: "mensual",
        approved: false,
      },
      {
        name: "Recordatorios y recupero de turnos",
        description:
          "Campaña de recupero de pacientes con turnos vencidos de especialidades con capacidad ociosa.",
        targetClient: "Pacientes particulares",
        channel: "WhatsApp",
        schedule: "semanal",
        approved: false,
      },
    ],
    initiatives: [
      {
        title: "Gestión integral de residuos patogénicos",
        scopes: ["medio ambiente", "social"],
        goal: "Reducir 25% la generación de residuos patogénicos por egreso y certificar la trazabilidad completa en 2027",
        plan: [
          { step: "Auditoría de segregación por servicio", date: "2026-12-05" },
          { step: "Capacitación a enfermería y recambio de contenedores", date: "2027-02-20" },
          { step: "Tablero mensual de kg por egreso por servicio", date: "2027-04-01" },
        ],
        kpis: [
          {
            name: "Residuos patogénicos por egreso",
            unit: "kg/egreso",
            target: 3.4,
            baseline: 4.6,
          },
          { name: "Servicios con segregación auditada", unit: "%", target: 100, baseline: 30 },
          { name: "Costo de disposición final", unit: "% vs 2026", target: -20, baseline: 0 },
        ],
        status: "en ejecución",
      },
      {
        title: "Consultorios barriales de prevención",
        scopes: ["social", "sectores desfavorecidos", "cultural"],
        goal: "Atender 2.400 consultas preventivas gratuitas en barrios sin cobertura durante 2027",
        plan: [
          { step: "Acuerdo con 2 centros comunitarios", date: "2027-01-10" },
          { step: "Jornadas quincenales de clínica y pediatría", date: "2027-03-01" },
          { step: "Campaña de vacunación y controles escolares", date: "2027-08-01" },
        ],
        kpis: [
          {
            name: "Consultas preventivas realizadas",
            unit: "consultas",
            target: 2400,
            baseline: 0,
          },
          { name: "Barrios con jornadas activas", unit: "barrios", target: 4, baseline: 0 },
          { name: "Derivaciones tempranas efectivas", unit: "pacientes", target: 180, baseline: 0 },
        ],
        status: "propuesta",
      },
    ],
  },
];
