"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { REGISTRY_ABI, REGISTRY_ADDRESS, hashAttestation } from "@/lib/attestation-contract";
import type { Attestation } from "@/lib/tee-engine";

export default function OnchainAttestation({ attestation }: { attestation: Attestation }) {
  const { isConnected } = useAccount();
  const [submitted, setSubmitted] = useState(false);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const contractReady = REGISTRY_ADDRESS && REGISTRY_ADDRESS.startsWith("0x") && REGISTRY_ADDRESS.length === 42;

  const handleStore = () => {
    if (!contractReady) return;
    const hash = hashAttestation(attestation);
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "store",
      args: [hash],
    });
    setSubmitted(true);
  };

  if (!contractReady) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 flex items-start gap-2.5">
        <Link2 className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[11px] text-gray-500">
            On-chain storage available after contract deployment.
          </div>
          <div className="text-[10px] text-gray-700 mt-0.5">
            Set <code className="text-gray-500">NEXT_PUBLIC_ATTESTATION_CONTRACT</code> in .env.local
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
        <div className="text-[11px] text-gray-500 flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5" />
          Connect wallet to store attestation on-chain
        </div>
      </div>
    );
  }

  if (isSuccess && txHash) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3"
      >
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-emerald-400">Stored on Polygon Amoy</div>
            <div className="text-[10px] font-mono text-gray-500 mt-1 truncate">{txHash}</div>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors mt-1.5"
            >
              View on Polygonscan <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error && submitted) {
    return (
      <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-red-400">Transaction failed</div>
            <div className="text-[10px] text-gray-600 mt-0.5 break-all">
              {error.message.slice(0, 120)}
            </div>
            <button
              onClick={() => { setSubmitted(false); handleStore(); }}
              className="text-[11px] text-purple-400 hover:text-purple-300 mt-1.5 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleStore}
      disabled={isPending || isConfirming}
      className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg p-3 text-left transition-colors disabled:opacity-50 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isPending || isConfirming ? (
            <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          ) : (
            <Link2 className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 transition-colors" />
          )}
          <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
              ? "Confirming on-chain..."
              : "Store attestation on-chain"}
          </span>
        </div>
        <span className="text-[10px] text-gray-600">Polygon Amoy</span>
      </div>
    </button>
  );
}
