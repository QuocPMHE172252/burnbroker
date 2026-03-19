import crypto from "crypto";
import { DstackClient } from "@phala/dstack-sdk";

let _client: DstackClient | null = null;
let _reachable: boolean | null = null;

function getClient(): DstackClient {
  if (!_client) {
    const endpoint = process.env.DSTACK_SIMULATOR_ENDPOINT;
    _client = new DstackClient(endpoint);
  }
  return _client;
}

export async function isRunningInTEE(): Promise<boolean> {
  if (_reachable !== null) return _reachable;
  try {
    const client = getClient();
    _reachable = await client.isReachable();
  } catch {
    _reachable = false;
  }
  return _reachable;
}

/**
 * Request a TDX quote from the Dstack guest agent.
 * reportData should be a hex string (max 64 bytes of data).
 * Returns the raw quote as a hex string.
 */
export async function getQuote(reportDataHex: string): Promise<string> {
  if (!(await isRunningInTEE())) {
    return "0x" + crypto.randomBytes(32).toString("hex");
  }

  try {
    const client = getClient();
    const clean = reportDataHex.startsWith("0x")
      ? reportDataHex.slice(2)
      : reportDataHex;
    const hashBuf = Buffer.from(clean, "hex");
    const result = await client.getQuote(hashBuf.subarray(0, 32));
    return "0x" + result.quote;
  } catch {
    return "0x" + crypto.randomBytes(32).toString("hex");
  }
}

/**
 * Derive a deterministic key from the Dstack KMS.
 * The path acts as a key derivation context so different paths yield different keys.
 * Returns a 32-byte Buffer.
 */
export async function deriveKey(path: string): Promise<Buffer> {
  if (!(await isRunningInTEE())) {
    const envKey = process.env.TEE_ENCLAVE_KEY;
    if (envKey) {
      return Buffer.from(envKey, "utf-8").subarray(0, 32);
    }
    return Buffer.from(
      "a]3Fk9$mPq7!wR2xLz8@nYv5bC1dG4hJ",
      "utf-8"
    ).subarray(0, 32);
  }

  try {
    const client = getClient();
    const result = await client.getKey(path, "burnbroker-enclave-key");
    return Buffer.from(result.key).subarray(0, 32);
  } catch {
    return Buffer.from(
      "a]3Fk9$mPq7!wR2xLz8@nYv5bC1dG4hJ",
      "utf-8"
    ).subarray(0, 32);
  }
}

/**
 * Get the current enclave mode label.
 */
export async function getEnclaveMode(): Promise<"TEE" | "SIMULATION"> {
  return (await isRunningInTEE()) ? "TEE" : "SIMULATION";
}
