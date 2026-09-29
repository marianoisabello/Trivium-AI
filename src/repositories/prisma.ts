import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { Connector } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";
import { PrismaClient } from "@prisma/client";

/**
 * Singleton de PrismaClient, server-only. En dev con HMR, guardarlo en
 * globalThis evita abrir una conexión nueva en cada recarga del módulo.
 *
 * Vercel no tiene IP saliente estática, así que en producción no se puede
 * simplemente whitelistear una IP en Cloud SQL: la conexión pasa por el
 * Cloud SQL Node.js Connector (túnel autenticado por IAM, sin exponer la
 * instancia a Internet). CLOUD_SQL_CONNECTION_NAME presente => modo Cloud
 * SQL Connector; ausente => DATABASE_URL directo (Postgres de
 * docker-compose en dev local).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

interface ServiceAccountCredentials {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getCloudSqlAuth(): GoogleAuth {
  const raw = process.env["GOOGLE_APPLICATION_CREDENTIALS_JSON"];
  if (!raw) {
    // Fuera de Vercel (ej. un futuro Cloud Run) se puede confiar en ADC del entorno.
    return new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/sqlservice.admin"] });
  }
  const credentials = JSON.parse(raw) as ServiceAccountCredentials;
  return new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/sqlservice.admin"],
  });
}

async function createCloudSqlPrismaClient(connectionName: string): Promise<PrismaClient> {
  const user = process.env["CLOUD_SQL_DB_USER"];
  const password = process.env["CLOUD_SQL_DB_PASSWORD"];
  const database = process.env["CLOUD_SQL_DB_NAME"];
  if (!user || !password || !database) {
    throw new Error(
      "Faltan env vars CLOUD_SQL_DB_USER / CLOUD_SQL_DB_PASSWORD / CLOUD_SQL_DB_NAME",
    );
  }

  // El socket tiene que llamarse .s.PGSQL.5432 (convención de Postgres) y
  // vivir en un directorio propio -- el connector no lo crea solo.
  const socketDir = path.join(os.tmpdir(), "cloudsql", connectionName.replace(/:/g, "_"));
  fs.mkdirSync(socketDir, { recursive: true });
  const socketPath = path.join(socketDir, ".s.PGSQL.5432");

  const connector = new Connector({ auth: getCloudSqlAuth() });
  await connector.startLocalProxy({
    instanceConnectionName: connectionName,
    listenOptions: { path: socketPath },
  });

  const datasourceUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost/${database}?host=${socketDir}`;
  return new PrismaClient({ datasourceUrl });
}

const connectionName = process.env["CLOUD_SQL_CONNECTION_NAME"];

export const prisma =
  globalForPrisma.prisma ??
  (await (connectionName ? createCloudSqlPrismaClient(connectionName) : new PrismaClient()));

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
