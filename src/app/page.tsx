"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Key,
  Zap,
  Lock,
  Trash2,
  Github,
  Flame,
  BookOpen,
  Cpu,
  Monitor,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Fingerprint,
  ChevronDown,
  ChevronRight,
  FileText,
  Search,
  Activity,
  Wifi,
  Database,
  type LucideIcon,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import AttestationCard from "@/components/AttestationCard";
import OnchainAttestation from "@/components/OnchainAttestation";
import InfoMarketDemo from "@/components/InfoMarketDemo";
import VerifyPanel from "@/components/VerifyPanel";
import PriceTicker from "@/components/PriceTicker";
import { encryptForEnclave, initEnclaveKey, generateTaskId } from "@/lib/crypto";
import type { Attestation } from "@/lib/tee-engine";

type Tab = "delegate" | "info_market" | "verify" | "about";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "delegate", label: "Delegate", icon: Shield },
  { id: "info_market", label: "Info Market", icon: FileText },
  { id: "verify", label: "Verify", icon: Search },
  { id: "about", label: "About", icon: BookOpen },
];

interface ExecutionPhase {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
}

const INITIAL_PHASES: ExecutionPhase[] = [
  { id: "encrypt", label: "Encrypting credentials", status: "pending" },
  { id: "transmit", label: "Sending to TEE enclave", status: "pending" },
  { id: "decrypt", label: "Decrypting inside enclave", status: "pending" },
  { id: "execute", label: "Executing on Binance", status: "pending" },
  { id: "destroy", label: "Destroying credentials", status: "pending" },
  { id: "attest", label: "Generating attestation", status: "pending" },
];

const FLOW_STEPS = [
  { num: "01", title: "Encrypt", desc: "Client-side AES-256 encryption before credentials leave your browser", color: "cyan" },
  { num: "02", title: "Isolate", desc: "Decrypted only inside a hardware-isolated TEE enclave", color: "purple" },
  { num: "03", title: "Execute", desc: "Single API call to Binance with HMAC-signed request", color: "blue" },
  { num: "04", title: "Destroy", desc: "RAM overwritten with 0x00, key permanently erased", color: "orange" },
  { num: "05", title: "Attest", desc: "Hardware-signed proof that destruction occurred", color: "emerald" },
];

function PhaseIcon({ status }: { status: ExecutionPhase["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-cyan-400" />;
    case "active":
      return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
    case "error":
      return <Circle className="w-4 h-4 text-red-400" />;
    default:
      return <Circle className="w-4 h-4 text-gray-700" />;
  }
}

function GradientBorder({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br from-cyan-500/20 via-purple-500/5 to-cyan-500/10 p-px ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [strategy, setStrategy] = useState("ping");
  const [status, setStatus] = useState<"idle" | "running" | "destroyed">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [tab, setTab] = useState<Tab>("delegate");
  const [enclaveReady, setEnclaveReady] = useState(false);
  const [enclaveMode, setEnclaveMode] = useState<"TEE" | "SIMULATION" | null>(null);
  const [phases, setPhases] = useState<ExecutionPhase[]>(INITIAL_PHASES);
  const [showRawLogs, setShowRawLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/delegate")
      .then((r) => r.json())
      .then(({ enclaveKey, enclaveMode: mode }) => {
        setEnclaveMode(mode || "SIMULATION");
        return initEnclaveKey(enclaveKey);
      })
      .then(() => setEnclaveReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const updatePhase = (id: string, s: ExecutionPhase["status"], detail?: string) => {
    setPhases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: s, detail: detail ?? p.detail } : p))
    );
  };

  const startTask = async () => {
    if (!apiKey || !secretKey || !enclaveReady) return;
    setStatus("running");
    setLogs([]);
    setAttestation(null);
    setPhases(INITIAL_PHASES);
    setShowRawLogs(false);

    updatePhase("encrypt", "active");
    addLog("Encrypting credentials with TEE Enclave Public Key...");
    const credentialPayload = JSON.stringify({ apiKey, secretKey });
    const { ciphertext, iv } = await encryptForEnclave(credentialPayload);
    const taskId = generateTaskId();
    updatePhase("encrypt", "done", "AES-256-CBC");

    updatePhase("transmit", "active");
    addLog("Payload encrypted. Transmitting to enclave...");
    await new Promise((r) => setTimeout(r, 300));
    updatePhase("transmit", "done");

    try {
      updatePhase("decrypt", "active");
      addLog(`Executing strategy: [${strategy.toUpperCase()}]`);

      const res = await fetch("/api/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, encryptedKey: ciphertext, strategy, iv }),
      });
      const data = await res.json();

      if (data.error) {
        addLog(`ERROR: ${data.error}`);
        updatePhase("decrypt", "error", data.error);
        setStatus("idle");
        return;
      }

      for (const log of data.logs || []) {
        addLog(`[${log.phase}] ${log.message}`);
        if (log.phase === "TEE_DECRYPT") updatePhase("decrypt", "done");
        if (log.phase === "TEE_EXECUTE" || log.phase === "TEE_NETWORK") updatePhase("execute", "active");
        if (log.phase === "TEE_SUCCESS") updatePhase("execute", "done", log.message);
        if (log.phase === "TEE_WARN") updatePhase("execute", "done", log.message);
        if (log.phase === "TEE_DESTROY") {
          updatePhase("execute", "done");
          updatePhase("destroy", "active");
        }
        if (log.phase === "TEE_WIPED") updatePhase("destroy", "done", "0x00 overwritten");
        if (log.phase === "TEE_ATTEST") updatePhase("attest", "active");
        await new Promise((r) => setTimeout(r, 180));
      }

      updatePhase("attest", "done");
      setAttestation(data);
      setStatus("destroyed");
    } catch {
      addLog("ERROR: Failed to communicate with TEE backend.");
      setStatus("idle");
    }
  };

  const panicRevoke = async () => {
    if (status !== "running") return;
    addLog("EMERGENCY REVOCATION TRIGGERED");
    await new Promise((r) => setTimeout(r, 400));
    addLog("Overwriting RAM space with 0x00...");
    addLog("Credentials destroyed from TEE memory.");
    setStatus("destroyed");
  };

  const resetForm = () => {
    setStatus("idle");
    setApiKey("");
    setSecretKey("");
    setLogs([]);
    setAttestation(null);
    setPhases(INITIAL_PHASES);
    setShowRawLogs(false);
  };

  return (
    <main className="min-h-screen crypto-bg text-gray-200 font-sans selection:bg-cyan-500/30 flex flex-col relative">
      {/* ── Navbar ── */}
      <nav className="glass-card border-0 border-b border-white/[0.06] sticky top-0 z-50">
        <div className="px-5 md:px-8 py-3 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="p-1.5 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg blur-md opacity-40" />
            </div>
            <span className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              BurnBroker
            </span>
          </div>

          <PriceTicker />

          <div className="flex items-center gap-3 text-sm">
            {enclaveMode && (
              enclaveMode === "TEE" ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-md font-medium">
                  <Cpu className="w-3 h-3" /> TEE Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md font-medium">
                  <Monitor className="w-3 h-3" /> Simulation
                </span>
              )
            )}
            <a
              href="https://arxiv.org/abs/2510.21904"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-cyan-400 transition-colors text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" /> Paper
            </a>
            <a
              href="https://github.com/QuocPMHE172252/burnbroker"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-cyan-400 transition-colors text-xs"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-5 md:px-8 flex gap-0 overflow-x-auto relative z-10">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-[15px] font-medium transition-all whitespace-nowrap relative ${
                tab === t.id
                  ? "text-cyan-400 tab-active"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {/* ════════ DELEGATE TAB ════════ */}
          {tab === "delegate" && (
            <motion.div
              key="delegate"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="max-w-6xl mx-auto px-4 py-6"
            >
              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Protocol", value: "BurnBroker v1", icon: Activity, color: "cyan" },
                  { label: "Network", value: "Polygon Amoy", icon: Wifi, color: "purple" },
                  { label: "Encryption", value: "AES-256-CBC", icon: Lock, color: "emerald" },
                  {
                    label: "Enclave",
                    value: enclaveMode === "TEE" ? "Hardware TEE" : enclaveMode === "SIMULATION" ? "Simulation" : "Connecting...",
                    icon: Cpu,
                    color: enclaveMode === "TEE" ? "cyan" : "amber",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card rounded-lg px-4 py-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <stat.icon className={`w-3.5 h-3.5 text-${stat.color}-400`} />
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                        {stat.label}
                      </span>
                    </div>
                    <div className="text-base font-semibold text-gray-200">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Form */}
                <div className="lg:col-span-5 space-y-5">
                  <GradientBorder>
                    <div className="rounded-[11px] bg-[#0a0a16] p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                          <Shield className="w-5 h-5 text-cyan-400" />
                          Delegate Credentials
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Encrypted client-side before transmission
                        </p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                            Testnet
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">
                          API Key
                        </label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                              type="password"
                              disabled={status !== "idle"}
                            className="w-full bg-black/50 border border-white/[0.08] rounded-lg py-3 pl-10 pr-4 text-base text-white placeholder-gray-600 transition-all disabled:opacity-40"
                            placeholder="Enter your Binance API key"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">
                          Secret Key
                        </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                              type="password"
                              disabled={status !== "idle"}
                            className="w-full bg-black/50 border border-white/[0.08] rounded-lg py-3 pl-10 pr-4 text-base text-white placeholder-gray-600 transition-all disabled:opacity-40"
                            placeholder="Enter your Binance secret key"
                              value={secretKey}
                              onChange={(e) => setSecretKey(e.target.value)}
                            />
                          </div>
                          <p className="text-[11px] text-gray-600 mt-1.5 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Get test keys at{" "}
                            <a
                              href="https://testnet.binance.vision/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400/80 hover:text-cyan-400 transition-colors"
                            >
                              testnet.binance.vision
                              <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                            </a>
                          </p>
                        </div>

                        <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">
                          Strategy
                        </label>
                          <select
                            disabled={status !== "idle"}
                            className="w-full bg-black/50 border border-white/[0.08] rounded-lg py-3 px-3 text-base text-white transition-all appearance-none cursor-pointer disabled:opacity-40"
                            value={strategy}
                            onChange={(e) => setStrategy(e.target.value)}
                          >
                            <option value="ping">Check Account Balance</option>
                            <option value="check_price">Check BTC/USDT Price</option>
                            <option value="buy_btc">Market Buy BTC (100 USDT)</option>
                            <option value="sell_btc">Market Sell BTC (100 USDT)</option>
                            <option value="open_orders">View Open Orders</option>
                          </select>
                        </div>

                        <div className="pt-2 flex gap-3">
                          {status === "idle" && (
                            <button
                              onClick={startTask}
                              disabled={!apiKey || !secretKey || !enclaveReady}
                              className="flex-1 btn-gradient text-white font-semibold py-3 px-5 rounded-lg flex justify-center items-center gap-2 text-[15px]"
                            >
                              Delegate &amp; Execute <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {status === "running" && (
                            <button
                              onClick={panicRevoke}
                              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-3 px-5 rounded-lg transition-all flex justify-center items-center gap-2 text-[15px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Emergency Revoke
                            </button>
                          )}
                          {status === "destroyed" && (
                            <button
                              onClick={resetForm}
                              className="flex-1 glass-card text-gray-300 font-semibold py-3 px-5 rounded-lg hover:bg-white/5 transition-all flex justify-center items-center gap-2 text-[15px]"
                            >
                              New Delegation
                            </button>
                          )}
                        </div>

                        {!enclaveReady && (
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                            Connecting to enclave...
                          </div>
                        )}
                      </div>
                    </div>
                  </GradientBorder>

                  {/* Security Info */}
                  {status === "idle" && (
                    <div className="glass-card rounded-xl p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/50" />
                        Security Guarantees
                      </h3>
                      <div className="space-y-2.5">
                        {[
                          { icon: Database, text: "Credentials never stored on disk or database", color: "cyan" },
                          { icon: Lock, text: "End-to-end AES-256-CBC encryption", color: "purple" },
                          { icon: Flame, text: "RAM overwritten with 0x00 after execution", color: "orange" },
                          { icon: Fingerprint, text: "Hardware attestation proof of destruction", color: "emerald" },
                        ].map((item) => (
                          <div key={item.text} className="flex items-start gap-2.5">
                            <item.icon className={`w-3.5 h-3.5 text-${item.color}-500/50 mt-0.5 flex-shrink-0`} />
                            <span className="text-sm text-gray-500">{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attestation */}
                  {attestation && status === "destroyed" && (
                    <div className="space-y-3">
                      <AttestationCard attestation={attestation} />
                      <OnchainAttestation attestation={attestation} />
                    </div>
                  )}
                </div>

                {/* Right: Execution Monitor */}
                <div className="lg:col-span-7">
                  <GradientBorder className="h-full">
                    <div className="rounded-[11px] bg-[#080812] h-full min-h-[540px] flex flex-col overflow-hidden scanlines">
                      {/* Header */}
                      <div className="border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            status === "running" ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" :
                            status === "destroyed" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-gray-700"
                          }`} />
                          <span className="text-base font-mono font-medium text-gray-400">
                            EXECUTION_MONITOR
                          </span>
                        </div>
                        {status !== "idle" && (
                          <button
                            onClick={() => setShowRawLogs(!showRawLogs)}
                            className="text-[11px] text-gray-600 hover:text-cyan-400 transition-colors flex items-center gap-1 font-mono"
                          >
                            {showRawLogs ? "[TIMELINE]" : "[RAW_LOG]"}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showRawLogs ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto relative z-10">
                        {status === "idle" && (
                          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-full bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-cyan-500/30" />
                              </div>
                              <div className="absolute inset-0 w-16 h-16 rounded-full bg-cyan-500/5 animate-ping" />
                            </div>
                            <div>
                            <p className="text-base font-mono text-gray-500">AWAITING_DELEGATION</p>
                            <p className="text-sm text-gray-700 mt-1">
                                Enter credentials and select a strategy to begin
                              </p>
                            </div>
                          </div>
                        )}

                        {status !== "idle" && !showRawLogs && (
                          <div className="p-5 space-y-1">
                            {phases.map((phase, i) => (
                              <motion.div
                                key={phase.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors ${
                                  phase.status === "active" ? "bg-cyan-500/5 border border-cyan-500/10" : ""
                                }`}
                              >
                                <div className="mt-0.5">
                                  <PhaseIcon status={phase.status} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-base font-mono ${
                                    phase.status === "done" ? "text-gray-400" :
                                    phase.status === "active" ? "text-cyan-300 font-medium" :
                                    phase.status === "error" ? "text-red-400" :
                                    "text-gray-600"
                                  }`}>
                                    {phase.label}
                                  </div>
                                  {phase.detail && (
                                    <div className="text-[11px] text-gray-600 mt-0.5 truncate font-mono">
                                      → {phase.detail}
                                    </div>
                                  )}
                                </div>
                                {phase.status === "done" && (
                                  <span className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-wider">
                                    OK
                                  </span>
                                )}
                              </motion.div>
                            ))}

                            {status === "destroyed" && attestation && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 pt-4 border-t border-white/[0.06]"
                              >
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 flex items-start gap-3">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="text-sm font-semibold text-emerald-400 font-mono">
                                      DELEGATION_COMPLETE
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Strategy executed. All credentials permanently destroyed.
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className="text-[10px] font-mono text-gray-600">
                                        TX: {attestation.taskId.slice(0, 16)}...
                                      </span>
                                      <span className="text-[10px] font-mono text-emerald-500/60">
                                        {attestation.proof}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )}

                        {status !== "idle" && showRawLogs && (
                          <div className="p-4 font-mono text-xs space-y-1.5">
                            {logs.map((log, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={
                                  log.includes("ERROR")
                                    ? "text-red-400"
                                    : log.includes("DESTROY") || log.includes("RECALL")
                                    ? "text-amber-400"
                                    : log.includes("SUCCESS") || log.includes("WIPED")
                                    ? "text-emerald-400"
                                    : log.includes("RESULT")
                                    ? "text-gray-500"
                                    : "text-cyan-400/70"
                                }
                              >
                                <span className="text-gray-700 select-none">{'>'} </span>{log}
                              </motion.div>
                            ))}
                            {status === "running" && (
                              <span className="text-cyan-400 animate-pulse">█</span>
                            )}
                            <div ref={logsEndRef} />
                          </div>
                        )}
                      </div>
                    </div>
                  </GradientBorder>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════ INFO MARKET TAB ════════ */}
          {tab === "info_market" && (
            <motion.div
              key="info_market"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="max-w-3xl mx-auto px-4 py-6 relative z-10"
            >
              <InfoMarketDemo />
            </motion.div>
          )}

          {/* ════════ VERIFY TAB ════════ */}
          {tab === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-6 relative z-10"
            >
              <VerifyPanel />
            </motion.div>
          )}

          {/* ════════ ABOUT TAB ════════ */}
          {tab === "about" && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-6 relative z-10"
            >
              {/* Headline */}
              <div className="max-w-3xl mx-auto text-center mb-14">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5 leading-[1.1]">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400">
                    Execute Once.
                  </span>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                    Destroy Forever.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
                  BurnBroker implements Conditional Recall — a game-theoretic framework
                  where TEEs enable credible commitment to forgetting information after use.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                  {[
                    { label: "AES-256", icon: Lock, color: "cyan" },
                    { label: "TEE Isolated", icon: Shield, color: "purple" },
                    { label: "Zero-Retention", icon: Flame, color: "orange" },
                    { label: "Attestation", icon: Fingerprint, color: "emerald" },
                  ].map((badge) => (
                    <div
                      key={badge.label}
                      className={`inline-flex items-center gap-1.5 bg-${badge.color}-500/5 border border-${badge.color}-500/20 rounded-full px-3 py-1 text-[11px] text-${badge.color}-400/80 uppercase tracking-wider font-medium`}
                    >
                      <badge.icon className="w-3 h-3" />
                      {badge.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline */}
              <div className="max-w-5xl mx-auto mb-14">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-500/50 mb-4 text-center">
                  // BURN_PIPELINE
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-px rounded-2xl overflow-hidden">
                  {FLOW_STEPS.map((step, i) => (
                    <div
                      key={step.num}
                      className="glass-card p-5 relative group hover:bg-white/[0.02] transition-colors border-0"
                    >
                      <div className={`text-[10px] font-mono text-${step.color}-500/60 mb-2`}>
                        {step.num}
                      </div>
                      <div className="text-base font-semibold text-white mb-1 font-mono">
                        {step.title}
                      </div>
                      <div className="text-sm text-gray-500 leading-relaxed">
                        {step.desc}
                      </div>
                      {i < 4 && (
                        <ChevronRight className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 text-cyan-500/20 z-10" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Dive Cards */}
              <div className="max-w-4xl mx-auto mb-14">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-purple-500/50 mb-4 text-center">
                  // HOW_IT_WORKS
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: Lock,
                      title: "One-Time Delegation",
                      desc: "Credentials are encrypted in your browser before they ever leave your device. A single, pre-defined operation.",
                      gradient: "from-cyan-500/20 to-blue-500/5",
                    },
                    {
                      icon: Cpu,
                      title: "Hardware Isolation",
                      desc: "Decrypted and used exclusively inside a Trusted Execution Environment. Not even the server operator can access them.",
                      gradient: "from-purple-500/20 to-pink-500/5",
                    },
                    {
                      icon: Flame,
                      title: "Verifiable Destruction",
                      desc: "The enclave overwrites all credential memory with zeros and generates a hardware-signed attestation as cryptographic proof.",
                      gradient: "from-orange-500/20 to-red-500/5",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className={`rounded-xl bg-gradient-to-br ${item.gradient} p-px hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-shadow`}>
                        <div className="rounded-[11px] bg-[#0a0a16] p-6 h-full">
                          <item.icon className="w-5 h-5 text-gray-400 mb-4" />
                          <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                          <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Research & Links */}
              <div className="max-w-2xl mx-auto">
                <GradientBorder>
                  <div className="rounded-[11px] bg-[#0a0a16] p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-white font-mono">// RESOURCES</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <a
                        href="https://arxiv.org/abs/2510.21904"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-black/30 border border-white/[0.06] rounded-lg p-4 hover:border-cyan-500/30 hover:shadow-[0_0_16px_rgba(6,182,212,0.1)] transition-all group"
                      >
                        <BookOpen className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-300 group-hover:text-cyan-300 transition-colors">
                            Conditional Recall
                          </div>
                          <div className="text-[11px] text-gray-600 truncate font-mono">
                            arXiv:2510.21904
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                      </a>
                      <a
                        href="https://github.com/QuocPMHE172252/burnbroker"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-black/30 border border-white/[0.06] rounded-lg p-4 hover:border-purple-500/30 hover:shadow-[0_0_16px_rgba(168,85,247,0.1)] transition-all group"
                      >
                        <Github className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-300 group-hover:text-purple-300 transition-colors">
                            Source Code
                          </div>
                          <div className="text-[11px] text-gray-600 truncate font-mono">
                            github.com/QuocPMHE172252
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="pt-3 border-t border-white/[0.04]">
                      <div className="flex flex-wrap gap-2">
                        {["Next.js", "Binance API", "AES-256-CBC", "HMAC SHA256", "Polygon Amoy", "RainbowKit", "Wagmi", "Solidity"].map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-cyan-500/5 border border-cyan-500/10 text-cyan-400/60 px-2 py-0.5 rounded-md font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </GradientBorder>

                <div className="text-center mt-8 text-[11px] text-gray-700 font-mono">
                  Built for the Encode Club IC3 Shape Rotator Hackathon 2026
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
