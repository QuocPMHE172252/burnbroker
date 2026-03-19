"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ShoppingCart,
  XCircle,
  Lock,
  FileText,
} from "lucide-react";
import { encryptForEnclave, generateTaskId } from "@/lib/crypto";
import AttestationCard from "./AttestationCard";
import type { Attestation } from "@/lib/tee-engine";

type Phase = "idle" | "uploading" | "inspecting" | "deciding" | "done";

export default function InfoMarketDemo() {
  const [secret, setSecret] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [attestation, setAttestation] = useState<Attestation | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startInspection = async () => {
    if (!secret.trim()) return;
    setPhase("uploading");
    setLogs([]);
    setAttestation(null);

    addLog("Encrypting seller secret for TEE enclave...");
    await new Promise((r) => setTimeout(r, 600));
    addLog("Secret encrypted and sent to TEE.");
    await new Promise((r) => setTimeout(r, 400));
    addLog("TEE enclave loaded secret into isolated memory.");
    addLog("Buyer can now inspect the information INSIDE the TEE.");
    setPhase("inspecting");
    await new Promise((r) => setTimeout(r, 800));
    addLog("Inspection window open. Buyer must decide: Accept or Reject.");
    setPhase("deciding");
  };

  const handleDecision = async (accepted: boolean) => {
    setPhase("uploading");
    if (accepted) {
      addLog("Buyer ACCEPTED the information. Processing trade...");
    } else {
      addLog(
        "Buyer REJECTED. TEE will destroy ALL copies (Arrow's Paradox resolved)."
      );
    }

    try {
      const { ciphertext, iv } = await encryptForEnclave(secret);
      const taskId = generateTaskId();

      const res = await fetch("/api/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "info_market",
          taskId,
          encryptedSecret: ciphertext,
          iv,
          buyerAccepted: accepted,
        }),
      });

      const data = await res.json();
      if (data.error) {
        addLog(`Error: ${data.error}`);
        setPhase("idle");
        return;
      }

      for (const log of data.logs || []) {
        addLog(`[${log.phase}] ${log.message}`);
        await new Promise((r) => setTimeout(r, 200));
      }

      setAttestation(data);
      addLog("Attestation generated. Information provably forgotten.");
      setPhase("done");
    } catch {
      addLog("Network error communicating with TEE enclave.");
      setPhase("idle");
    }
  };

  const reset = () => {
    setPhase("idle");
    setSecret("");
    setLogs([]);
    setAttestation(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-white/10 p-8 rounded-2xl backdrop-blur-md">
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-500" />
          Arrow&apos;s Information Paradox
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          A buyer wants to inspect information before purchasing, but inspection
          reveals the secret. The TEE solves this: if the buyer rejects, the TEE{" "}
          <span className="text-blue-300">provably forgets everything</span>.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Seller&apos;s Secret Information
            </label>
            <textarea
              disabled={phase !== "idle"}
              rows={3}
              className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 resize-none"
              placeholder="Enter trading signal, alpha, or any secret..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>

          {phase === "idle" && (
            <button
              onClick={startInspection}
              disabled={!secret.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <Lock className="w-4 h-4" /> Upload to TEE for Inspection
            </button>
          )}

          {phase === "inspecting" && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
              <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-pulse" />
              <p className="text-blue-300 text-sm">
                Buyer is inspecting the secret inside the TEE...
              </p>
            </div>
          )}

          {phase === "deciding" && (
            <div className="flex gap-4">
              <button
                onClick={() => handleDecision(true)}
                className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-semibold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> Accept & Buy
              </button>
              <button
                onClick={() => handleDecision(false)}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject & Forget
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-[#050508] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-[#0a0a0f] border-b border-white/10 p-3 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-mono text-gray-400">
              Info_Market_TEE_Log
            </span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1.5 max-h-[300px] overflow-y-auto">
            {logs.map((l, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={
                  l.includes("REJECTED") || l.includes("DESTROYED")
                    ? "text-orange-400"
                    : l.includes("ACCEPTED") || l.includes("Attestation")
                    ? "text-emerald-400"
                    : "text-blue-300"
                }
              >
                {l}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {attestation && <AttestationCard attestation={attestation} />}

      {phase === "done" && (
        <button
          onClick={reset}
          className="w-full text-sm text-gray-500 hover:text-gray-300 underline transition-colors"
        >
          Run Another Info Market Demo
        </button>
      )}
    </div>
  );
}
