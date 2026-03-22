import { NextResponse } from "next/server";

const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(async (symbol) => {
        const res = await fetch(`${BINANCE_API}?symbol=${symbol}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`${symbol}: ${res.status}`);
        return res.json();
      })
    );

    const prices = results
      .filter(
        (r): r is PromiseFulfilledResult<{ symbol: string; lastPrice: string; priceChangePercent: string }> =>
          r.status === "fulfilled"
      )
      .map((r) => ({
        symbol: r.value.symbol.replace("USDT", ""),
        price: parseFloat(r.value.lastPrice),
        change: parseFloat(r.value.priceChangePercent),
      }));

    if (prices.length === 0) {
      return NextResponse.json({ error: "No prices available" }, { status: 502 });
    }

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
