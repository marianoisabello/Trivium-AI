import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// @grpc/grpc-js (pulled in transitively by @google-cloud/cloud-sql-connector,
// loaded lazily by src/repositories/prisma.ts on first DB access) references
// __dirname at module scope to locate bundled .proto files for a gRPC
// reflection feature we never use. Nitro's ESM bundle for Vercel doesn't shim
// that CJS global for every chunk, so merely importing the chain throws
// `ReferenceError: __dirname is not defined` -- taking down that request (and,
// before prisma.ts's lazy init, every request). The exact value here is
// irrelevant (the .proto lookup it feeds is dead code for us); it only needs
// to exist so the reference doesn't throw. Runs once at module init, well
// before the dynamic import below ever pulls that chain in.
if (typeof (globalThis as { __dirname?: string }).__dirname === "undefined") {
  (globalThis as { __dirname?: string }).__dirname = dirname(fileURLToPath(import.meta.url));
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
