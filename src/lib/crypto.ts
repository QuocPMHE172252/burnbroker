const ALGORITHM = "AES-CBC";
const KEY_LENGTH = 256;

let cachedKey: CryptoKey | null = null;
let cachedKeyHex: string | null = null;

export async function initEnclaveKey(serverKeyHex: string): Promise<void> {
  const keyBytes = hexToBytes(serverKeyHex);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt"]
  );
  cachedKeyHex = serverKeyHex;
}

export async function encryptForEnclave(
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  if (!cachedKey) {
    throw new Error("Enclave key not initialized. Call initEnclaveKey first.");
  }

  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    cachedKey,
    encoded
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(cipherBuffer)),
    iv: bytesToHex(iv),
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateTaskId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(bytes);
}
