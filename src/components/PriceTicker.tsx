"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Price {
  symbol: string;
  price: number;
  change: number;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export default function PriceTicker() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [flash, setFlash] = useState<Record<string, "up" | "down" | null>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (!res.ok) return;
      const data: Price[] = await res.json();
      if (!Array.isArray(data)) return;

      setPrices((prev) => {
        const newFlash: Record<string, "up" | "down" | null> = {};
        for (const p of data) {
          const old = prev.find((o) => o.symbol === p.symbol);
          if (old && p.price !== old.price) {
            newFlash[p.symbol] = p.price > old.price ? "up" : "down";
          }
        }
        if (Object.keys(newFlash).length > 0) {
          setFlash(newFlash);
          setTimeout(() => setFlash({}), 800);
        }
        return data;
      });
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 8000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  if (prices.length === 0) return null;

  return (
    <div className="hidden md:flex items-center gap-3">
      {prices.map((p) => (
        <div
          key={p.symbol}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors duration-300 ${
            flash[p.symbol] === "up"
              ? "bg-emerald-500/10"
              : flash[p.symbol] === "down"
              ? "bg-red-500/10"
              : "bg-transparent"
          }`}
        >
          <span className="text-[10px] font-mono text-gray-500 font-medium">
            {p.symbol}
          </span>
          <span
            className={`text-[11px] font-mono font-semibold transition-colors duration-300 ${
              flash[p.symbol] === "up"
                ? "text-emerald-400"
                : flash[p.symbol] === "down"
                ? "text-red-400"
                : "text-gray-300"
            }`}
          >
            ${formatPrice(p.price)}
          </span>
          <span
            className={`text-[10px] font-mono font-medium flex items-center gap-0.5 ${
              p.change >= 0 ? "text-emerald-400/70" : "text-red-400/70"
            }`}
          >
            {p.change >= 0 ? (
              <TrendingUp className="w-2.5 h-2.5" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5" />
            )}
            {p.change >= 0 ? "+" : ""}
            {p.change.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
