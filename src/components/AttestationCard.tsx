"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Copy, ExternalLink, Cpu, Monitor } from "lucide-react";
import type { Attestation } from "@/lib/tee-engine";
import { useState } from "react";

export default function AttestationCard({
  attestation,
  txHash,
}: {
  attestation: Attestation;
  txHash?: string;
}) {
  const [copied, setCopied] = useState(false);
  const isTEE = attestation.enclaveMode === "TEE";

  const copyQuote = () => {
    navigator.clipboard.writeText(attestation.hardwareQuote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-full">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-emerald-400 font-semibold">
              Attestation Verified
            </h4>
            {isTEE ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                <Cpu className="w-2.5 h-2.5" /> Hardware TEE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                <Monitor className="w-2.5 h-2.5" /> Simulation
              </span>
            )}
          </div>
          <p className="text-sm text-emerald-500/70 mt-1">
            {isTEE
              ? "Hardware-signed TDX attestation received. Key destruction verified by Intel TDX enclave."
              : "Simulated attestation. Deploy to Phala Cloud for hardware-signed TDX proof."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-gray-500 mb-1">Task ID</div>
          <div className="text-gray-300 font-mono truncate">
            {attestation.taskId}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-gray-500 mb-1">Hardware ID</div>
          <div className="text-gray-300 font-mono">
            {attestation.hardwareId}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-3 col-span-2">
          <div className="text-gray-500 mb-1 flex items-center justify-between">
            <span>
              Hardware Quote{" "}
              {isTEE ? (
                <span className="text-emerald-400">(TDX-signed)</span>
              ) : (
                <span className="text-yellow-400">(mock)</span>
              )}
            </span>
            <button
              onClick={copyQuote}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="text-gray-300 font-mono truncate">
            {copied ? "Copied!" : attestation.hardwareQuote}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-gray-500 mb-1">Key SHA-256 Prefix</div>
          <div className="text-gray-300 font-mono">{attestation.keyHash}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-gray-500 mb-1">Proof</div>
          <div className="text-emerald-400 font-mono text-[10px]">
            {attestation.proof}
          </div>
        </div>
      </div>

      {txHash && (
        <a
          href={`https://amoy.polygonscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View on-chain attestation
        </a>
      )}
    </motion.div>
  );
}
