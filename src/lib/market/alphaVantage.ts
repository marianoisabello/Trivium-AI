import type { MarketDataProvider, MarketQuote, QuotableAssetType } from "@/lib/market/types";
import { getCached, setCached } from "@/lib/market/cache";

interface AlphaVantageGlobalQuote {
  "Global Quote"?: {
    "01. symbol"?: string;
    "05. price"?: string;
    "10. change percent"?: string;
  };
}

async function fetchQuote(symbol: string): Promise<MarketQuote> {
  const apiKey = process.env["MARKET_DATA_API_KEY"];
  if (!apiKey) throw new Error("Falta MARKET_DATA_API_KEY");

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alpha Vantage respondió ${response.status}`);

  const body = (await response.json()) as AlphaVantageGlobalQuote;
  const quote = body["Global Quote"];
  const price = Number(quote?.["05. price"]);
  const changePercent = Number(quote?.["10. change percent"]?.replace("%", ""));

  if (!quote || Number.isNaN(price) || Number.isNaN(changePercent)) {
    throw new Error(`Alpha Vantage no devolvió una cotización válida para "${symbol}"`);
  }

  return {
    symbol,
    price,
    changePercent,
    dataSource: "api",
    asOf: new Date().toISOString(),
  };
}

/** Adapter Alpha Vantage con caché de 15 minutos (src/lib/market/cache.ts). */
export const alphaVantageProvider: MarketDataProvider = {
  async getQuote(symbol: string, _assetType: QuotableAssetType): Promise<MarketQuote> {
    const cacheKey = `alphavantage:${symbol}`;
    const cached = getCached<MarketQuote>(cacheKey);
    if (cached) return cached;

    const quote = await fetchQuote(symbol);
    setCached(cacheKey, quote);
    return quote;
  },
};
