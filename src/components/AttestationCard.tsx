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
    >
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/5 to-emerald-500/10 p-px">
        <div className="rounded-[11px] bg-[#0a0a16] p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-white font-mono">ATTESTATION_PROOF</h4>
                {isTEE ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-medium">
                    <Cpu className="w-2.5 h-2.5" /> Hardware TEE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
                    <Monitor className="w-2.5 h-2.5" /> Simulation
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                {isTEE
                  ? "Hardware-signed TDX attestation. Key destruction verified by Intel TDX enclave."
                  : "Simulated attestation. Deploy to TEE hardware for signed proof."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/40 rounded-lg p-3 border border-white/[0.04]">
              <div className="text-[10px] text-cyan-500/50 mb-1 font-mono">TASK_ID</div>
              <div className="text-gray-400 font-mono truncate text-[11px]">{attestation.taskId}</div>
            </div>
            <div className="bg-black/40 rounded-lg p-3 border border-white/[0.04]">
              <div className="text-[10px] text-cyan-500/50 mb-1 font-mono">HW_ID</div>
              <div className="text-gray-400 font-mono text-[11px]">{attestation.hardwareId}</div>
            </div>
            <div className="bg-black/40 rounded-lg p-3 col-span-2 border border-white/[0.04]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-cyan-500/50 font-mono">
                  HW_QUOTE{" "}
                  {isTEE ? (
                    <span className="text-emerald-500">(TDX)</span>
                  ) : (
                    <span className="text-amber-500">(SIM)</span>
                  )}
                </span>
                <button
                  onClick={copyQuote}
                  className="text-gray-600 hover:text-cyan-400 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="text-gray-400 font-mono truncate text-[11px]">
                {copied ? "Copied to clipboard" : attestation.hardwareQuote}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-3 border border-white/[0.04]">
              <div className="text-[10px] text-cyan-500/50 mb-1 font-mono">KEY_HASH</div>
              <div className="text-gray-400 font-mono text-[11px]">{attestation.keyHash}</div>
            </div>
            <div className="bg-black/40 rounded-lg p-3 border border-white/[0.04]">
              <div className="text-[10px] text-cyan-500/50 mb-1 font-mono">PROOF</div>
              <div className="text-emerald-400 font-mono text-[10px]">{attestation.proof}</div>
            </div>
          </div>

          {txHash && (
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
            >
              <ExternalLink className="w-3 h-3" /> View on-chain attestation →
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
