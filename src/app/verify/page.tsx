"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Shield,
  Zap,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import type { Attestation } from "@/lib/tee-engine";

interface Verification {
  verified: boolean;
  source: "phala" | "local_mock";
  details: string;
}

interface AttestationWithVerification extends Attestation {
  verification?: Verification;
}

export default function VerifyPage() {
  const [taskId, setTaskId] = useState("");
  const [result, setResult] = useState<AttestationWithVerification | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Attestation[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const search = async () => {
    if (!taskId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `/api/attestation/${taskId.trim()}?verify=true`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to connect to server.");
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/attestation/all");
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
      setHistoryLoaded(true);
    } catch {
      setHistoryLoaded(true);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-200 font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />

      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            BurnBroker
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            Attestation Verifier
          </h1>
          <p className="text-gray-400 mb-8">
            Verify that an API key was securely destroyed inside a TEE enclave.
          </p>

          {/* Search */}
          <div className="flex gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter Task ID..."
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
            </div>
            <button
              onClick={search}
              disabled={loading || !taskId.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold px-6 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? "..." : "Verify"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 flex items-center gap-3 mb-8"
            >
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">{error}</span>
            </motion.div>
          )}

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 mb-8"
            >
              {/* Verification Banner */}
              {result.verification && (
                <div
                  className={`rounded-xl p-5 flex items-start gap-3 ${
                    result.verification.verified
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  {result.verification.verified ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400 mt-0.5" />
                  )}
                  <div>
                    <h3
                      className={`font-semibold text-lg ${
                        result.verification.verified
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {result.verification.verified
                        ? "Attestation Verified"
                        : "Verification Failed"}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {result.verification.details}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {result.verification.source === "phala" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full">
                          <Cpu className="w-3 h-3" /> Verified by Phala Cloud
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-full">
                          <Monitor className="w-3 h-3" /> Local Simulation
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Enclave Mode Badge */}
              <div className="flex items-center gap-2">
                {result.enclaveMode === "TEE" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                    <Cpu className="w-3.5 h-3.5" /> Hardware TEE (Intel TDX)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1.5 rounded-lg">
                    <Monitor className="w-3.5 h-3.5" /> Simulation Mode
                  </span>
                )}
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
                <DetailRow label="Task ID" value={result.taskId} mono />
                <DetailRow label="Status" value={result.status} highlight />
                <DetailRow label="Strategy" value={result.strategyExecuted} />
                <DetailRow label="Enclave Mode" value={result.enclaveMode} />
                <DetailRow label="Hardware ID" value={result.hardwareId} mono />
                <DetailRow
                  label="Hardware Quote"
                  value={result.hardwareQuote}
                  mono
                />
                <DetailRow
                  label="Key SHA-256 Prefix"
                  value={result.keyHash}
                  mono
                />
                <DetailRow label="Proof" value={result.proof} highlight />
                <DetailRow
                  label="Timestamp"
                  value={new Date(result.enclaveTimestamp).toLocaleString()}
                />
              </div>

              {/* Log trace */}
              {result.logs && result.logs.length > 0 && (
                <div className="bg-[#050508] border border-white/10 rounded-xl overflow-hidden">
                  <div className="bg-[#0a0a0f] border-b border-white/10 p-3 text-sm font-mono text-gray-400">
                    Enclave Execution Log
                  </div>
                  <div className="p-4 font-mono text-xs space-y-1 max-h-[300px] overflow-y-auto">
                    {result.logs.map(
                      (l: { phase: string; message: string }, i: number) => (
                        <div key={i} className="text-blue-300">
                          <span className="text-gray-500">[{l.phase}]</span>{" "}
                          {l.message}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* History */}
          <div className="border-t border-white/5 pt-8">
            {!historyLoaded ? (
              <button
                onClick={loadHistory}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2 py-3"
              >
                <Clock className="w-4 h-4" />
                Load Recent Attestations
              </button>
            ) : history.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-4">
                  Recent Attestations
                </h3>
                <div className="space-y-2">
                  {history.map((a) => (
                    <button
                      key={a.taskId}
                      onClick={() => {
                        setTaskId(a.taskId);
                        setResult(null);
                        setError("");
                        setTimeout(() => search(), 0);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between hover:bg-white/10 transition-colors text-left"
                    >
                      <div>
                        <div className="text-xs font-mono text-gray-300 truncate max-w-[300px]">
                          {a.taskId}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {a.strategyExecuted} &mdash;{" "}
                          {new Date(a.enclaveTimestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.enclaveMode === "TEE" ? (
                          <Cpu className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Monitor className="w-3 h-3 text-yellow-400" />
                        )}
                        <span className="text-xs text-emerald-400 font-semibold">
                          {a.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center">
                No attestations found yet. Delegate a task first.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <span
        className={`text-sm text-right break-all ${
          mono ? "font-mono text-gray-300" : ""
        } ${highlight ? "text-emerald-400 font-semibold" : "text-gray-300"}`}
      >
        {value}
      </span>
    </div>
  );
}
