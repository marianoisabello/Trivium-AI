export interface MarketQuote {
  symbol: string;
  price: number;
  changePercent: number;
  dataSource: "api" | "manual";
  asOf: string;
}

export type QuotableAssetType = "acción" | "derivado";

export interface MarketDataProvider {
  getQuote(symbol: string, assetType: QuotableAssetType): Promise<MarketQuote>;
}
