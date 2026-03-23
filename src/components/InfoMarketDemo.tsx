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
import { saveAttestationToSession } from "@/lib/attestation-storage";
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
      saveAttestationToSession(data);
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
      <div className="rounded-xl bg-gradient-to-br from-blue-500/20 via-cyan-500/5 to-purple-500/10 p-px">
        <div className="rounded-[11px] bg-[#0a0a16] p-8">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-mono">Arrow&apos;s Information Paradox</span>
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            A buyer wants to inspect information before purchasing, but inspection
            reveals the secret. The TEE solves this: if the buyer rejects, the TEE{" "}
            <span className="text-cyan-300">provably forgets everything</span>.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-cyan-500/50 mb-2">
                SELLER_SECRET
              </label>
              <textarea
                disabled={phase !== "idle"}
                rows={3}
                className="w-full bg-black/50 border border-white/[0.08] rounded-lg py-3 px-4 text-white placeholder-gray-600 transition-all disabled:opacity-50 resize-none"
                placeholder="Enter trading signal, alpha, or any secret..."
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </div>

            {phase === "idle" && (
              <button
                onClick={startInspection}
                disabled={!secret.trim()}
                className="w-full btn-gradient text-white font-semibold py-3 px-6 rounded-lg flex justify-center items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Upload to TEE for Inspection
              </button>
            )}

            {phase === "inspecting" && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-center">
                <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-pulse" />
                <p className="text-blue-300 text-sm font-mono">
                  BUYER_INSPECTING_SECRET...
                </p>
              </div>
            )}

            {phase === "deciding" && (
              <div className="flex gap-4">
                <button
                  onClick={() => handleDecision(true)}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold py-3 rounded-lg transition-all flex justify-center items-center gap-2 hover:shadow-[0_0_16px_rgba(52,211,153,0.15)]"
                >
                  <ShoppingCart className="w-4 h-4" /> Accept & Buy
                </button>
                <button
                  onClick={() => handleDecision(false)}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-3 rounded-lg transition-all flex justify-center items-center gap-2 hover:shadow-[0_0_16px_rgba(239,68,68,0.15)]"
                >
                  <XCircle className="w-4 h-4" /> Reject & Forget
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/5 p-px">
          <div className="rounded-[11px] bg-[#080812] overflow-hidden scanlines">
            <div className="border-b border-white/[0.06] p-3 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-cyan-500/50" />
              <span className="text-sm font-mono text-cyan-400/60">
                INFO_MARKET_TEE_LOG
              </span>
            </div>
            <div className="p-4 font-mono text-xs space-y-1.5 max-h-[300px] overflow-y-auto relative z-10">
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
                      : "text-cyan-400/70"
                  }
                >
                  <span className="text-gray-700 select-none">{'>'} </span>{l}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {attestation && <AttestationCard attestation={attestation} />}

      {phase === "done" && (
        <button
          onClick={reset}
          className="w-full text-sm text-gray-500 hover:text-cyan-400 transition-colors font-mono"
        >
          → Run Another Info Market Demo
        </button>
      )}
    </div>
  );
}
