import type { Attestation } from "@/lib/tee-engine";

const STORAGE_KEY = "burnbroker_attestations_v1";
const MAX_ENTRIES = 50;

/**
 * Serverless (e.g. Vercel) uses in-memory Maps per instance — Verify API often misses
 * attestations created on another instance. We mirror successful runs in sessionStorage
 * so Verify works in the same browser session.
 */
export function saveAttestationToSession(a: Attestation): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const map: Record<string, Attestation> = raw ? JSON.parse(raw) : {};
    map[a.taskId] = a;
    const ids = Object.keys(map);
    if (ids.length > MAX_ENTRIES) {
      const sorted = ids.sort(
        (x, y) => (map[y].enclaveTimestamp ?? 0) - (map[x].enclaveTimestamp ?? 0)
      );
      for (let i = MAX_ENTRIES; i < sorted.length; i++) {
        delete map[sorted[i]!];
      }
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getAttestationFromSession(taskId: string): Attestation | null {
  if (typeof window === "undefined") return null;
  const id = taskId.trim();
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, Attestation>;
    return map[id] ?? null;
  } catch {
    return null;
  }
}

export function listAttestationsFromSession(): Attestation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, Attestation>;
    return Object.values(map).sort((a, b) => b.enclaveTimestamp - a.enclaveTimestamp);
  } catch {
    return [];
  }
}
