import { NextResponse } from "next/server";

const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

export async function GET() {
  try {
    const params = new URLSearchParams({
      symbols: JSON.stringify(SYMBOLS),
    });

    const res = await fetch(`${BINANCE_API}?${params}`, {
      next: { revalidate: 5 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Binance API error" }, { status: 502 });
    }

    const data = await res.json();

    const prices = data.map(
      (t: { symbol: string; lastPrice: string; priceChangePercent: string }) => ({
        symbol: t.symbol.replace("USDT", ""),
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
      })
    );

    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
