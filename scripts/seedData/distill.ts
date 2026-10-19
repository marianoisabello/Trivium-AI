/**
 * Opcional: regenera parámetros del seed desde los datasets reales.
 *
 * Los datasets NO se commitean al repo. Para usar este script, descargá a
 * mano en scripts/seedData/raw/ (gitignored):
 * 1. Online Retail II (CC BY 4.0): https://archive.ics.uci.edu/dataset/502/online+retail+ii
 *    -> exportar la hoja a CSV como raw/online_retail_ii.csv
 * 2. OWID CO2 (CC BY 4.0): https://github.com/owid/co2-data
 *    -> raw/owid-co2-data.csv
 *
 * Uso: bun scripts/seedData/distill.ts
 * Imprime estadísticas (tamaño de canasta, frecuencias, intensidades de
 * emisión) para ajustar a mano los valores de data.ts. No escribe archivos
 * ni toca la base: es una herramienta de calibración para humanos.
 */
import fs from "node:fs";
import path from "node:path";

const RAW_DIR = path.join(import.meta.dirname ?? __dirname, "raw");

function summarizeRetail(csvPath: string): void {
  const lines = fs.readFileSync(csvPath, "utf8").split("\n").slice(1);
  const basketSizes = new Map<string, number>();
  for (const line of lines) {
    const invoice = line.split(",")[0];
    if (!invoice || invoice.startsWith("C")) continue; // C = cancelación
    basketSizes.set(invoice, (basketSizes.get(invoice) ?? 0) + 1);
  }
  const sizes = [...basketSizes.values()].sort((a, b) => a - b);
  const p = (q: number) => sizes[Math.floor(sizes.length * q)] ?? 0;
  console.log(
    `Online Retail II — facturas: ${sizes.length}, ítems por canasta p25/p50/p75: ${p(0.25)}/${p(0.5)}/${p(0.75)}`,
  );
  console.log("Sugerencia: ajustar basketSize en buildClients() a ese rango intercuartil.");
}

function summarizeOwid(csvPath: string): void {
  const lines = fs.readFileSync(csvPath, "utf8").split("\n");
  const header = lines[0]!.split(",");
  const idx = {
    country: header.indexOf("country"),
    year: header.indexOf("year"),
    intensity: header.indexOf("co2_per_unit_energy"),
    renewables: header.indexOf("renewables_share_energy"),
  };
  const latest = lines
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => c[idx.country] === "Argentina" && Number(c[idx.year]) >= 2020);
  for (const row of latest.slice(-3)) {
    console.log(
      `OWID Argentina ${row[idx.year]}: CO2/energía=${row[idx.intensity]}, renovables=${row[idx.renewables]}%`,
    );
  }
  console.log("Sugerencia: usar estos órdenes de magnitud para los KPIs ambientales de data.ts.");
}

const retail = path.join(RAW_DIR, "online_retail_ii.csv");
const owid = path.join(RAW_DIR, "owid-co2-data.csv");
if (fs.existsSync(retail)) summarizeRetail(retail);
else console.log(`(falta ${retail} — ver instrucciones arriba)`);
if (fs.existsSync(owid)) summarizeOwid(owid);
else console.log(`(falta ${owid} — ver instrucciones arriba)`);
