import type { AIProvider } from "@/lib/ai/types";
import { mockProvider } from "@/lib/ai/mock";
import { vertexProvider } from "@/lib/ai/vertex";

/**
 * Punto único de acceso a IA generativa. Los servicios deben llamar siempre
 * a getAIProvider() — nunca importar un adapter (mock, vertex) directamente.
 * AI_PROVIDER=mock sirve para desarrollo local sin credenciales de Google.
 */
export function getAIProvider(): AIProvider {
  const selected = process.env["AI_PROVIDER"] ?? "vertex";
  switch (selected) {
    case "vertex":
      return vertexProvider;
    case "mock":
      return mockProvider;
    default:
      throw new Error(`AI_PROVIDER desconocido: "${selected}"`);
  }
}
