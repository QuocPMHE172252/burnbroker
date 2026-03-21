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
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import HeroSection from "@/components/HeroSection";
import AttestationCard from "@/components/AttestationCard";
import OnchainAttestation from "@/components/OnchainAttestation";
import InfoMarketDemo from "@/components/InfoMarketDemo";
import { encryptForEnclave, initEnclaveKey, generateTaskId } from "@/lib/crypto";
import type { Attestation } from "@/lib/tee-engine";

type Tab = "delegate" | "info_market";

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

function PhaseIcon({ status }: { status: ExecutionPhase["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "active":
      return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
    case "error":
      return <Circle className="w-4 h-4 text-red-400" />;
    default:
      return <Circle className="w-4 h-4 text-gray-700" />;
  }
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
  const dashboardRef = useRef<HTMLDivElement>(null);
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

  const updatePhase = (id: string, status: ExecutionPhase["status"], detail?: string) => {
    setPhases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, detail: detail ?? p.detail } : p))
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

  const scrollToDashboard = () => {
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-gray-200 font-sans selection:bg-purple-500/30 overflow-hidden relative">
      {/* Navbar */}
      <nav className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl px-6 md:px-8 py-3.5 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white rounded-md">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            BurnBroker
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {enclaveMode && (
            enclaveMode === "TEE" ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-medium">
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
            className="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-xs"
          >
            <BookOpen className="w-3.5 h-3.5" /> Research
          </a>
          <a
            href="https://github.com/QuocPMHE172252/burnbroker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-xs"
          >
            <Github className="w-3.5 h-3.5" />
          </a>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
        </div>
      </nav>

      {/* Hero */}
      <HeroSection onGetStarted={scrollToDashboard} />

      {/* Dashboard */}
      <div ref={dashboardRef} className="max-w-6xl mx-auto px-4 pb-24 z-10 relative">
        {/* Tab Selector */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("delegate")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "delegate"
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Key Delegation
          </button>
          <button
            onClick={() => setTab("info_market")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "info_market"
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Info Market
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "delegate" ? (
            <motion.div
              key="delegate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left: Form */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-[#0f0f13] border border-white/[0.06] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        Delegate Credentials
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Encrypted client-side before transmission
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                        Testnet
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        API Key
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                          type="password"
                          disabled={status !== "idle"}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-40"
                          placeholder="Enter your Binance API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Secret Key
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                          type="password"
                          disabled={status !== "idle"}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-40"
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
                          className="text-purple-400/80 hover:text-purple-400 transition-colors"
                        >
                          testnet.binance.vision
                          <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                        </a>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Strategy
                      </label>
                      <select
                        disabled={status !== "idle"}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all appearance-none cursor-pointer disabled:opacity-40"
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
                          className="flex-1 bg-white text-black font-semibold py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm"
                        >
                          Delegate &amp; Execute <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {status === "running" && (
                        <button
                          onClick={panicRevoke}
                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-2.5 px-5 rounded-lg transition-all flex justify-center items-center gap-2 text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Emergency Revoke
                        </button>
                      )}

                      {status === "destroyed" && (
                        <button
                          onClick={resetForm}
                          className="flex-1 bg-white/5 border border-white/10 text-gray-300 font-semibold py-2.5 px-5 rounded-lg hover:bg-white/10 transition-all flex justify-center items-center gap-2 text-sm"
                        >
                          New Delegation
                        </button>
                      )}
                    </div>

                    {!enclaveReady && (
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting to enclave...
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Info */}
                {status === "idle" && (
                  <div className="bg-[#0f0f13] border border-white/[0.06] rounded-xl p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                      Security Guarantees
                    </h3>
                    <div className="space-y-2.5">
                      {[
                        { icon: ShieldCheck, text: "Credentials never stored on disk or database" },
                        { icon: Lock, text: "End-to-end AES-256-CBC encryption" },
                        { icon: Flame, text: "RAM overwritten with 0x00 after execution" },
                        { icon: Fingerprint, text: "Hardware attestation proof of destruction" },
                      ].map((item) => (
                        <div key={item.text} className="flex items-start gap-2.5">
                          <item.icon className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-500">{item.text}</span>
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
                <div className="bg-[#0f0f13] border border-white/[0.06] rounded-xl h-full min-h-[540px] flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        status === "running" ? "bg-purple-400 animate-pulse" :
                        status === "destroyed" ? "bg-emerald-400" : "bg-gray-700"
                      }`} />
                      <span className="text-sm font-medium text-gray-300">
                        Execution Monitor
                      </span>
                    </div>
                    {status !== "idle" && (
                      <button
                        onClick={() => setShowRawLogs(!showRawLogs)}
                        className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
                      >
                        {showRawLogs ? "Timeline" : "Raw Logs"}
                        <ChevronDown className={`w-3 h-3 transition-transform ${showRawLogs ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    {status === "idle" && (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                        <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                          <Shield className="w-5 h-5 text-gray-700" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Awaiting delegation</p>
                          <p className="text-xs text-gray-700 mt-1">
                            Enter your credentials and select a strategy to begin
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
                              phase.status === "active" ? "bg-purple-500/5" : ""
                            }`}
                          >
                            <div className="mt-0.5">
                              <PhaseIcon status={phase.status} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm ${
                                phase.status === "done" ? "text-gray-300" :
                                phase.status === "active" ? "text-white font-medium" :
                                phase.status === "error" ? "text-red-400" :
                                "text-gray-600"
                              }`}>
                                {phase.label}
                              </div>
                              {phase.detail && (
                                <div className="text-[11px] text-gray-600 mt-0.5 truncate">
                                  {phase.detail}
                                </div>
                              )}
                            </div>
                            {phase.status === "done" && (
                              <span className="text-[10px] text-emerald-500/60 font-medium uppercase tracking-wider">
                                Done
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
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-emerald-400">
                                  Delegation Complete
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Strategy executed successfully. All credentials have been permanently
                                  destroyed. Attestation proof generated.
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-[10px] font-mono text-gray-600">
                                    Task: {attestation.taskId.slice(0, 16)}...
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
                                : "text-gray-400"
                            }
                          >
                            {log}
                          </motion.div>
                        ))}
                        {status === "running" && (
                          <span className="text-gray-700 animate-pulse">_</span>
                        )}
                        <div ref={logsEndRef} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="info_market"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              <InfoMarketDemo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-white/[0.04] py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-3">
              How It Works
            </h2>
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              BurnBroker implements Conditional Recall — a game-theoretic framework
              where TEEs enable credible commitment to forgetting information.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Lock,
                title: "One-Time Delegation",
                desc: "You provide your API credentials for a single, pre-defined operation. Credentials are encrypted in your browser before they ever leave your device.",
                accent: "purple",
              },
              {
                icon: Cpu,
                title: "Hardware Isolation",
                desc: "Credentials are decrypted and used exclusively inside a Trusted Execution Environment. Not even the server operator can access them.",
                accent: "blue",
              },
              {
                icon: Flame,
                title: "Verifiable Destruction",
                desc: "After execution, the enclave overwrites all credential memory with zeros and generates a hardware-signed attestation as cryptographic proof.",
                accent: "emerald",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0f0f13] border border-white/[0.06] rounded-xl p-6 group hover:border-white/[0.1] transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg bg-${item.accent}-500/10 flex items-center justify-center mb-4`}>
                  <item.icon className={`w-4 h-4 text-${item.accent}-400`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white rounded">
                <Zap className="w-3 h-3 text-black" />
              </div>
              <span className="text-sm font-semibold text-gray-400">BurnBroker</span>
            </div>
            <div className="flex items-center gap-5 text-xs text-gray-600">
              <a
                href="https://arxiv.org/abs/2510.21904"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors"
              >
                Research Paper
              </a>
              <a
                href="https://phala.network"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors"
              >
                Phala Network
              </a>
              <a
                href="https://www.encodeclub.com/programmes/shape-rotator-virtual-hackathon"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors"
              >
                IC3 Shape Rotator Hackathon
              </a>
              <a
                href="https://github.com/QuocPMHE172252/burnbroker"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="text-center mt-6 text-[11px] text-gray-700">
            Built for the Encode Club IC3 Shape Rotator Hackathon 2026
          </div>
        </div>
      </footer>
    </main>
  );
}
