import crypto from "crypto";

const DEFAULT_KEY = "a]3Fk9$mPq7!wR2xLz8@nYv5bC1dG4hJ";

export async function getQuote(reportDataHex: string): Promise<string> {
  const clean = reportDataHex.startsWith("0x") ? reportDataHex.slice(2) : reportDataHex;
  const hmac = crypto.createHmac("sha256", "burnbroker-quote-key").update(clean).digest("hex");
  return "0x" + hmac;
}

export async function deriveKey(path: string): Promise<Buffer> {
  const envKey = process.env.TEE_ENCLAVE_KEY;
  if (envKey) {
    return Buffer.from(envKey, "utf-8").subarray(0, 32);
  }
  const derived = crypto.createHmac("sha256", DEFAULT_KEY).update(path).digest();
  return derived.subarray(0, 32);
}

export async function getEnclaveMode(): Promise<"TEE" | "SIMULATION"> {
  return "SIMULATION";
}
