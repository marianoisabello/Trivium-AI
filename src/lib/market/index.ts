import type { Asset } from "@/lib/types";
import type { MarketQuote } from "@/lib/market/types";
import { alphaVantageProvider } from "@/lib/market/alphaVantage";

export type { MarketDataProvider, MarketQuote, QuotableAssetType } from "@/lib/market/types";

/**
 * Cotización de un activo con degradación automática: si el activo no es
 * cotizable (producto/servicio) o si Alpha Vantage falla, devuelve el valor
 * cargado por el usuario con dataSource: "manual".
 */
export async function getQuoteWithFallback(asset: Asset): Promise<MarketQuote> {
  if (asset.type !== "acción" && asset.type !== "derivado") {
    return manualQuote(asset);
  }
  try {
    return await alphaVantageProvider.getQuote(asset.name, asset.type);
  } catch (error) {
    console.error(`[market] fallback a manual para "${asset.name}":`, error);
    return manualQuote(asset);
  }
}

function manualQuote(asset: Asset): MarketQuote {
  return {
    symbol: asset.name,
    price: asset.value,
    changePercent: 0,
    dataSource: "manual",
    asOf: new Date().toISOString(),
  };
}
