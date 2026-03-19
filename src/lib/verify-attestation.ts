const PHALA_ATTESTATION_API =
  "https://cloud-api.phala.network/api/v1/attestations/verify";

export interface VerificationResult {
  verified: boolean;
  source: "phala" | "local_mock";
  details: string;
  raw?: unknown;
}

/**
 * Verify a TDX attestation quote via Phala Cloud's public API.
 * For simulation quotes (random hex), returns a mock result.
 */
export async function verifyQuote(
  quoteHex: string,
  enclaveMode: "TEE" | "SIMULATION"
): Promise<VerificationResult> {
  if (enclaveMode === "SIMULATION") {
    return {
      verified: true,
      source: "local_mock",
      details:
        "Running in SIMULATION mode. Quote is locally generated and not hardware-signed. Deploy to Phala Cloud for real TDX attestation.",
    };
  }

  try {
    const cleanQuote = quoteHex.startsWith("0x")
      ? quoteHex.slice(2)
      : quoteHex;

    const res = await fetch(PHALA_ATTESTATION_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote: cleanQuote }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        verified: false,
        source: "phala",
        details: `Phala API returned ${res.status}: ${text}`,
      };
    }

    const data = await res.json();

    return {
      verified: true,
      source: "phala",
      details: "Quote verified by Phala Cloud attestation service (Intel TDX).",
      raw: data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      verified: false,
      source: "phala",
      details: `Failed to reach Phala attestation API: ${msg}`,
    };
  }
}
