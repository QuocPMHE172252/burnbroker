"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Monitor,
  Loader2,
} from "lucide-react";
import type { Attestation } from "@/lib/tee-engine";

interface Verification {
  verified: boolean;
  source: "phala" | "local_mock";
  details: string;
}

interface AttestationWithVerification extends Attestation {
  verification?: Verification;
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
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-white/[0.03] last:border-0">
      <span className="text-[11px] text-gray-600 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <span
        className={`text-xs text-right break-all ${
          mono ? "font-mono text-gray-400" : "text-gray-300"
        } ${highlight ? "text-emerald-400 font-medium" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function VerifyPanel() {
  const [taskId, setTaskId] = useState("");
  const [result, setResult] = useState<AttestationWithVerification | null>(
    null
  );
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
      const res = await fetch(`/api/attestation/${taskId.trim()}?verify=true`);
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-purple-400" />
          Verify Attestation
        </h2>
        <p className="text-sm text-gray-500">
          Verify that credentials were securely destroyed inside a TEE enclave.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            className="w-full bg-[#0f0f13] border border-white/[0.08] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            placeholder="Enter Task ID..."
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !taskId.trim()}
          className="bg-white text-black font-semibold px-5 rounded-lg text-sm transition-all disabled:opacity-30 hover:bg-gray-100 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 flex items-center gap-3 mb-8"
        >
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </motion.div>
      )}

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 mb-8"
        >
          {result.verification && (
            <div
              className={`rounded-lg p-4 flex items-start gap-3 ${
                result.verification.verified
                  ? "bg-emerald-500/5 border border-emerald-500/10"
                  : "bg-red-500/5 border border-red-500/10"
              }`}
            >
              {result.verification.verified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div>
                <h3
                  className={`font-semibold text-sm ${
                    result.verification.verified
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {result.verification.verified
                    ? "Attestation Verified"
                    : "Verification Failed"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {result.verification.details}
                </p>
                <div className="mt-2">
                  {result.verification.source === "phala" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-medium">
                      <Cpu className="w-2.5 h-2.5" /> Phala Cloud
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-medium">
                      <Monitor className="w-2.5 h-2.5" /> Local
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {result.enclaveMode === "TEE" ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-medium">
                <Cpu className="w-3 h-3" /> Hardware TEE (Intel TDX)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md font-medium">
                <Monitor className="w-3 h-3" /> Simulation Mode
              </span>
            )}
          </div>

          <div className="bg-[#0f0f13] border border-white/[0.06] rounded-xl p-5 space-y-3">
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
            <DetailRow label="Key Hash" value={result.keyHash} mono />
            <DetailRow label="Proof" value={result.proof} highlight />
            <DetailRow
              label="Timestamp"
              value={new Date(result.enclaveTimestamp).toLocaleString()}
            />
          </div>

          {result.logs && result.logs.length > 0 && (
            <div className="bg-[#0a0a0e] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="border-b border-white/[0.06] px-4 py-2.5 text-xs font-medium text-gray-500">
                Execution Log
              </div>
              <div className="p-4 font-mono text-[11px] space-y-1 max-h-[300px] overflow-y-auto">
                {result.logs.map(
                  (l: { phase: string; message: string }, i: number) => (
                    <div key={i} className="text-gray-500">
                      <span className="text-gray-700">[{l.phase}]</span>{" "}
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
      <div className="border-t border-white/[0.04] pt-8">
        {!historyLoaded ? (
          <button
            onClick={loadHistory}
            className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center gap-2 py-3"
          >
            <Clock className="w-3.5 h-3.5" /> Load Recent Attestations
          </button>
        ) : history.length > 0 ? (
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-3">Recent</h3>
            <div className="space-y-1.5">
              {history.map((a) => (
                <button
                  key={a.taskId}
                  onClick={() => {
                    setTaskId(a.taskId);
                    setResult(null);
                    setError("");
                  }}
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 flex items-center justify-between hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div>
                    <div className="text-xs font-mono text-gray-400 truncate max-w-[300px]">
                      {a.taskId}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      {a.strategyExecuted} &mdash;{" "}
                      {new Date(a.enclaveTimestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.enclaveMode === "TEE" ? (
                      <Cpu className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Monitor className="w-3 h-3 text-amber-500" />
                    )}
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {a.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-700 text-center">
            No attestations yet. Delegate a task first.
          </p>
        )}
      </div>
    </div>
  );
}
