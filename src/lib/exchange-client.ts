import crypto from "crypto";

const BINANCE_TESTNET = "https://testnet.binance.vision";
const BINANCE_PRODUCTION = "https://api.binance.com";

function getBaseUrl(): string {
  return process.env.BINANCE_USE_PRODUCTION === "true"
    ? BINANCE_PRODUCTION
    : BINANCE_TESTNET;
}

function sign(queryString: string, secretKey: string): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(queryString)
    .digest("hex");
}

async function binanceRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  apiKey: string,
  secretKey?: string,
  params?: Record<string, string>
): Promise<{ status: number; data: unknown }> {
  const url = new URL(path, getBaseUrl());
  let queryString = "";

  if (params) {
    const entries = Object.entries(params);
    queryString = entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  }

  if (secretKey) {
    const timestamp = Date.now().toString();
    queryString += (queryString ? "&" : "") + `timestamp=${timestamp}`;
    const signature = sign(queryString, secretKey);
    queryString += `&signature=${signature}`;
  }

  if (queryString) {
    url.search = queryString;
  }

  const res = await fetch(url.toString(), {
    method,
    headers: { "X-MBX-APIKEY": apiKey },
  });

  const data = await res.json();
  return { status: res.status, data };
}

export interface ExchangeResult {
  success: boolean;
  strategy: string;
  response: unknown;
  executionTime: number;
}

export async function executeStrategy(
  strategy: string,
  apiKey: string,
  secretKey: string
): Promise<ExchangeResult> {
  const start = Date.now();

  try {
    let result: { status: number; data: unknown };

    switch (strategy) {
      case "ping": {
        result = await binanceRequest("GET", "/api/v3/account", apiKey, secretKey);
        break;
      }

      case "buy_btc": {
        result = await binanceRequest("POST", "/api/v3/order", apiKey, secretKey, {
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quoteOrderQty: "100",
        });
        break;
      }

      case "sell_btc": {
        result = await binanceRequest("POST", "/api/v3/order", apiKey, secretKey, {
          symbol: "BTCUSDT",
          side: "SELL",
          type: "MARKET",
          quoteOrderQty: "100",
        });
        break;
      }

      case "check_price": {
        result = await binanceRequest("GET", "/api/v3/ticker/price", apiKey, undefined, {
          symbol: "BTCUSDT",
        });
        break;
      }

      case "open_orders": {
        result = await binanceRequest("GET", "/api/v3/openOrders", apiKey, secretKey, {
          symbol: "BTCUSDT",
        });
        break;
      }

      default: {
        result = await binanceRequest("GET", "/api/v3/account", apiKey, secretKey);
        break;
      }
    }

    return {
      success: result.status >= 200 && result.status < 300,
      strategy,
      response: result.data,
      executionTime: Date.now() - start,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown exchange error";
    return {
      success: false,
      strategy,
      response: { error: msg },
      executionTime: Date.now() - start,
    };
  }
}
