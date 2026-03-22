import { NextResponse } from "next/server";

const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PriceRow = { symbol: string; price: number; change: number };

async function fetchFromBinance(): Promise<PriceRow[]> {
  const results = await Promise.allSettled(
    SYMBOLS.map(async (symbol) => {
      const res = await fetch(`${BINANCE_API}?symbol=${symbol}`, {
        signal: AbortSignal.timeout(12000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`${symbol}: ${res.status}`);
      return res.json() as Promise<{ symbol: string; lastPrice: string; priceChangePercent: string }>;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ symbol: string; lastPrice: string; priceChangePercent: string }> =>
      r.status === "fulfilled"
    )
    .map((r) => ({
      symbol: r.value.symbol.replace("USDT", ""),
      price: parseFloat(r.value.lastPrice),
      change: parseFloat(r.value.priceChangePercent),
    }));
}

/** Fallback when Binance is unreachable from serverless (e.g. Vercel region / IP blocks). */
async function fetchFromCoinGecko(): Promise<PriceRow[]> {
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd&include_24hr_change=true";
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`CoinGecko: ${res.status}`);
  const data = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number | null }
  >;

  const map: { id: string; symbol: string }[] = [
    { id: "bitcoin", symbol: "BTC" },
    { id: "ethereum", symbol: "ETH" },
    { id: "binancecoin", symbol: "BNB" },
  ];

  return map
    .map(({ id, symbol }) => {
      const row = data[id];
      if (!row?.usd) return null;
      return {
        symbol,
        price: row.usd,
        change: row.usd_24h_change ?? 0,
      };
    })
    .filter((x): x is PriceRow => x !== null);
}

export async function GET() {
  try {
    let prices = await fetchFromBinance();
    if (prices.length === 0) {
      prices = await fetchFromCoinGecko();
    }

    if (prices.length === 0) {
      return NextResponse.json({ error: "No prices available" }, { status: 502 });
    }

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    try {
      const prices = await fetchFromCoinGecko();
      if (prices.length > 0) {
        return NextResponse.json(prices, {
          headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
        });
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
