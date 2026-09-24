import { GoogleAuth } from "google-auth-library";
import type { AnalysisInput, Scenario } from "@/lib/types";
import type { AIProvider } from "@/lib/ai/types";
import { buildScenariosPrompt } from "@/lib/ai/prompts";
import { parseScenariosResponse } from "@/lib/ai/scenarioParser";
import { localRiskCalculator } from "@/lib/risk";
import { getQuoteWithFallback } from "@/lib/market";

interface ServiceAccountCredentials {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getCredentials(): ServiceAccountCredentials {
  const raw = process.env["GOOGLE_APPLICATION_CREDENTIALS_JSON"];
  if (!raw) throw new Error("Falta la env var GOOGLE_APPLICATION_CREDENTIALS_JSON");
  return JSON.parse(raw) as ServiceAccountCredentials;
}

let authClient: GoogleAuth | undefined;
function getAuth(): GoogleAuth {
  authClient ??= new GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return authClient;
}

interface VertexGenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function callGenerateContent(prompt: string): Promise<string> {
  const model = process.env["VERTEX_AI_MODEL"];
  if (!model) throw new Error("Falta la env var VERTEX_AI_MODEL");
  const location = process.env["VERTEX_AI_LOCATION"] ?? "global";
  const { project_id: projectId } = getCredentials();

  const client = await getAuth().getClient();
  // El endpoint "global" (sin prefijo regional) es el recomendado por Google
  // para los modelos Gemini actuales; solo las locations regionales llevan
  // el prefijo "<location>-" en el host.
  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const { data } = await client.request<VertexGenerateContentResponse>({
    url,
    method: "POST",
    data: {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    },
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Vertex AI no devolvió contenido en la respuesta");
  return text;
}

/**
 * Orquesta prompt -> modelo -> parseo. `callModel` es inyectable para poder
 * testear el flujo de reintento sin llamar a Vertex real.
 */
export async function generateScenariosViaModel(
  input: AnalysisInput,
  callModel: (prompt: string) => Promise<string> = callGenerateContent,
): Promise<Scenario[]> {
  const [risk, quotes] = await Promise.all([
    Promise.resolve(localRiskCalculator.calculate(input)),
    Promise.all(input.assets.map((asset) => getQuoteWithFallback(asset))),
  ]);
  const prompt = buildScenariosPrompt(input, { risk, quotes });

  try {
    return parseScenariosResponse(await callModel(prompt));
  } catch (firstError) {
    try {
      return parseScenariosResponse(await callModel(prompt));
    } catch {
      throw firstError;
    }
  }
}

export const vertexProvider: AIProvider = {
  generateScenarios: (input) => generateScenariosViaModel(input),
};
