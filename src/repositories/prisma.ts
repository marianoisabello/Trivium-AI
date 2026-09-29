import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { Connector } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";
import { PrismaClient } from "@prisma/client";

/**
 * Singleton de PrismaClient, server-only, con inicialización lazy.
 *
 * TanStack Start empaqueta los server functions en un mismo entry point de
 * SSR: un `await` a nivel de módulo corre en el cold start de CUALQUIER
 * request, incluso rutas que no tocan la base. Si el Cloud SQL Connector
 * tarda o falla ahí, tira abajo toda la app (visto en producción: hasta
 * rutas sin DB devolvían 500). Por eso `prisma` es un Proxy -- la conexión
 * real recién se intenta en el primer método invocado, y solo ese request
 * específico falla si algo sale mal.
 *
 * Vercel no tiene IP saliente estática, así que en producción no se puede
 * simplemente whitelistear una IP en Cloud SQL: la conexión pasa por el
 * Cloud SQL Node.js Connector (túnel autenticado por IAM, sin exponer la
 * instancia a Internet). CLOUD_SQL_CONNECTION_NAME presente => modo Cloud
 * SQL Connector; ausente => DATABASE_URL directo (Postgres de
 * docker-compose en dev local).
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | undefined;
  prismaInitPromise?: Promise<PrismaClient> | undefined;
};

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

function getPrismaClient(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return Promise.resolve(globalForPrisma.prisma);

  globalForPrisma.prismaInitPromise ??= (async () => {
    const connectionName = process.env["CLOUD_SQL_CONNECTION_NAME"];
    const client = connectionName
      ? await createCloudSqlPrismaClient(connectionName)
      : new PrismaClient();
    globalForPrisma.prisma = client;
    return client;
  })().catch((error: unknown) => {
    // No dejar la promesa fallida cacheada -- el próximo request reintenta
    // la conexión en vez de quedar rechazado para siempre.
    globalForPrisma.prismaInitPromise = undefined;
    throw error;
  });

  return globalForPrisma.prismaInitPromise;
}

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
type Delegate = Record<PropertyKey, AsyncFn>;

function createModelProxy(modelName: PropertyKey): Delegate {
  return new Proxy({} as Delegate, {
    get(_target, method) {
      return async (...args: unknown[]) => {
        const client = await getPrismaClient();
        const delegate = (client as unknown as Record<PropertyKey, Delegate>)[modelName]!;
        return Reflect.apply(delegate[method]!, delegate, args);
      };
    },
  });
}

/**
 * Proxy que se comporta como PrismaClient para quien lo usa (mismas
 * llamadas `prisma.modelo.metodo(...)` y `prisma.$metodo(...)` que un
 * cliente real), pero recién conecta en el primer uso -- ver comentario
 * arriba. El cast final es la única mentira de tipos: en runtime el shape
 * es equivalente para await/then, que es como se usa en todo el código.
 */
export const prisma = new Proxy({} as Record<PropertyKey, unknown>, {
  get(_target, prop) {
    if (typeof prop === "string" && prop.startsWith("$")) {
      return async (...args: unknown[]) => {
        const client = await getPrismaClient();
        const method = (client as unknown as Record<PropertyKey, AsyncFn>)[prop]!;
        return Reflect.apply(method, client, args);
      };
    }
    return createModelProxy(prop);
  },
}) as unknown as PrismaClient;
