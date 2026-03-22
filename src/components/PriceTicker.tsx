"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, "up" | "down" | null>>({});

  const fetchPrices = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      const body = await res.json();

      if (!res.ok) {
        setPrices([]);
        setError(typeof body?.error === "string" ? body.error : "Price feed unavailable");
        return;
      }

      if (!Array.isArray(body)) {
        setPrices([]);
        setError("Invalid response");
        return;
      }

      setPrices((prev) => {
        const newFlash: Record<string, "up" | "down" | null> = {};
        for (const p of body as Price[]) {
          const old = prev.find((o) => o.symbol === p.symbol);
          if (old && p.price !== old.price) {
            newFlash[p.symbol] = p.price > old.price ? "up" : "down";
          }
        }
        if (Object.keys(newFlash).length > 0) {
          setFlash(newFlash);
          setTimeout(() => setFlash({}), 800);
        }
        return body as Price[];
      });
    } catch {
      setPrices([]);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card">
        <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
        <span className="text-xs font-mono text-gray-500">Loading prices...</span>
      </div>
    );
  }

  if (error && prices.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card border-amber-500/20 max-w-[200px] sm:max-w-none">
        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="text-[11px] font-mono text-amber-400/90 truncate" title={error}>
          {error}
        </span>
      </div>
    );
  }

  if (prices.length === 0) return null;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {prices.map((p, i) => (
        <div
          key={p.symbol}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-card transition-colors duration-300 ${
            i > 0 ? "hidden lg:flex" : ""
          } ${
            flash[p.symbol] === "up"
              ? "!bg-emerald-500/10 !border-emerald-500/20"
              : flash[p.symbol] === "down"
              ? "!bg-red-500/10 !border-red-500/20"
              : ""
          }`}
        >
          <span className="text-xs font-mono text-gray-400 font-semibold">
            {p.symbol}
          </span>
          <span
            className={`text-sm font-mono font-bold transition-colors duration-300 ${
              flash[p.symbol] === "up"
                ? "text-emerald-400"
                : flash[p.symbol] === "down"
                ? "text-red-400"
                : "text-white"
            }`}
          >
            ${formatPrice(p.price)}
          </span>
          <span
            className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${
              p.change >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {p.change >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {p.change >= 0 ? "+" : ""}
            {p.change.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
