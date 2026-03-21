import { keccak256, encodePacked } from "viem";
import type { Attestation } from "./tee-engine";

export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ||
  "") as `0x${string}`;

export const REGISTRY_ABI = [
  {
    name: "store",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "verify",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  {
    name: "attestations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "Stored",
    type: "event",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "submitter", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export function hashAttestation(attestation: Attestation): `0x${string}` {
  return keccak256(
    encodePacked(
      ["string", "string", "string", "string"],
      [
        attestation.taskId,
        attestation.keyHash,
        attestation.strategyExecuted,
        attestation.hardwareQuote,
      ]
    )
  );
}
