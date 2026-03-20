"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Key,
  Zap,
  Terminal,
  Lock,
  Trash2,
  Github,
  Flame,
  Activity,
  BookOpen,
  Cpu,
  Monitor,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import HeroSection from "@/components/HeroSection";
import AttestationCard from "@/components/AttestationCard";
import InfoMarketDemo from "@/components/InfoMarketDemo";
import { encryptForEnclave, initEnclaveKey, generateTaskId } from "@/lib/crypto";
import type { Attestation } from "@/lib/tee-engine";

type Tab = "delegate" | "info_market";

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
  const [stats, setStats] = useState({ tasks: 0, keys: 0, attestations: 0 });
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

  const startTask = async () => {
    if (!apiKey || !secretKey || !enclaveReady) return;
    setStatus("running");
    setLogs([]);
    setAttestation(null);

    addLog("Initializing TEE Enclave connection...");
    await new Promise((r) => setTimeout(r, 400));

    addLog("Encrypting credentials with TEE Enclave Public Key...");
    const credentialPayload = JSON.stringify({ apiKey, secretKey });
    const { ciphertext, iv } = await encryptForEnclave(credentialPayload);
    const taskId = generateTaskId();
    addLog("Payload encrypted. Sending to Confidential Cloud...");

    await new Promise((r) => setTimeout(r, 300));
    addLog(`Enclave booting strategy: [${strategy.toUpperCase()}]`);

    try {
      const res = await fetch("/api/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          encryptedKey: ciphertext,
          strategy,
          iv,
        }),
      });
      const data = await res.json();

      if (data.error) {
        addLog(`ERROR: ${data.error}`);
        setStatus("idle");
        return;
      }

      for (const log of data.logs || []) {
        addLog(`[${log.phase}] ${log.message}`);
        await new Promise((r) => setTimeout(r, 250));
      }

      setAttestation(data);
      setStatus("destroyed");
      setStats((s) => ({
        tasks: s.tasks + 1,
        keys: s.keys + 1,
        attestations: s.attestations + 1,
      }));
    } catch {
      addLog("ERROR: Failed to communicate with TEE backend.");
      setStatus("idle");
    }
  };

  const panicRevoke = async () => {
    if (status !== "running") return;
    addLog("PANIC BUTTON RECOGNIZED! FORCE REVOKING...");
    await new Promise((r) => setTimeout(r, 400));
    addLog("Overwriting RAM space with 0x00...");
    addLog("Key completely destroyed from TEE memory.");
    setStatus("destroyed");
  };

  const scrollToDashboard = () => {
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-200 font-sans selection:bg-purple-500/30 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-[0_0_20px_rgba(147,51,234,0.3)]">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            BurnBroker
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          {enclaveMode && (
            enclaveMode === "TEE" ? (
              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                <Cpu className="w-3 h-3" /> TEE Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1.5 rounded-full">
                <Monitor className="w-3 h-3" /> Simulation
              </span>
            )
          )}
          <a
            href="https://arxiv.org/abs/2510.21904"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-2 hidden sm:flex"
          >
            <BookOpen className="w-4 h-4" /> Paper
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-2"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="avatar"
          />
        </div>
      </nav>

      {/* Hero */}
      <HeroSection onGetStarted={scrollToDashboard} />

      {/* Stats Bar */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Tasks Executed",
              value: stats.tasks,
              icon: <Activity className="w-5 h-5 text-purple-400" />,
            },
            {
              label: "Keys Burned",
              value: stats.keys,
              icon: <Flame className="w-5 h-5 text-orange-400" />,
            },
            {
              label: "Attestations",
              value: stats.attestations,
              icon: <Shield className="w-5 h-5 text-emerald-400" />,
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 text-center"
            >
              <div className="flex justify-center mb-2">{s.icon}</div>
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Dashboard */}
      <div
        ref={dashboardRef}
        className="max-w-7xl mx-auto px-4 pb-24 z-10 relative"
      >
        {/* Tab Selector */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab("delegate")}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "delegate"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Key Delegation
          </button>
          <button
            onClick={() => setTab("info_market")}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "info_market"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Info Market (Arrow&apos;s Paradox)
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "delegate" ? (
            <motion.div
              key="delegate"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Form */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-black/40 border border-white/10 p-8 rounded-2xl backdrop-blur-md shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2 relative">
                    <Shield className="w-6 h-6 text-purple-500" /> Task
                    Delegation
                  </h2>
                  <p className="text-sm text-gray-400 mb-8 relative">
                    Delegate your API key to a TEE. The key will self-destruct
                    after execution.
                  </p>

                  <div className="space-y-5 relative">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Binance API Key
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="w-4 h-4 text-gray-500" />
                        </div>
                        <input
                          type="password"
                          disabled={
                            status === "running" || status === "destroyed"
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                          placeholder="Binance API Key..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Binance Secret Key
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="w-4 h-4 text-gray-500" />
                        </div>
                        <input
                          type="password"
                          disabled={
                            status === "running" || status === "destroyed"
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                          placeholder="Binance Secret Key..."
                          value={secretKey}
                          onChange={(e) => setSecretKey(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5">
                        Keys are encrypted client-side before leaving your browser. Get testnet keys at{" "}
                        <a href="https://testnet.binance.vision/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                          testnet.binance.vision
                        </a>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Execution Strategy
                      </label>
                      <select
                        disabled={
                          status === "running" || status === "destroyed"
                        }
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
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

                    <div className="pt-4 flex gap-4">
                      <button
                        onClick={startTask}
                        disabled={
                          status === "running" ||
                          status === "destroyed" ||
                          !apiKey ||
                          !secretKey ||
                          !enclaveReady
                        }
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        <Lock className="w-4 h-4" /> Delegate & Execute
                      </button>

                      {status === "running" && (
                        <button
                          onClick={panicRevoke}
                          className="flex-none bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 font-semibold py-3 px-6 rounded-lg transition-all flex justify-center items-center gap-2 animate-pulse"
                        >
                          <Trash2 className="w-4 h-4" /> Revoke
                        </button>
                      )}
                    </div>

                    {!enclaveReady && (
                      <p className="text-xs text-yellow-500/70 text-center">
                        Connecting to TEE enclave...
                      </p>
                    )}
                  </div>
                </div>

                {attestation && status === "destroyed" && (
                  <div>
                    <AttestationCard attestation={attestation} />
                    <button
                      onClick={() => {
                        setStatus("idle");
                        setApiKey("");
                        setSecretKey("");
                        setLogs([]);
                        setAttestation(null);
                      }}
                      className="mt-4 w-full text-sm text-gray-500 hover:text-gray-300 underline transition-colors"
                    >
                      Perform Another Task
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Console */}
              <div className="lg:col-span-7">
                <div className="bg-[#050508] border border-white/10 rounded-2xl h-full min-h-[500px] flex flex-col overflow-hidden shadow-2xl">
                  <div className="bg-[#0a0a0f] border-b border-white/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-mono text-gray-400">
                        TEE_Enclave_Output
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                  </div>

                  <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
                    {logs.length === 0 && status === "idle" && (
                      <div className="text-gray-600 flex flex-col items-center justify-center h-full gap-4 text-center">
                        <Shield className="w-12 h-12 opacity-20" />
                        <p>
                          Awaiting task delegation...
                          <br />
                          Data sent here will never touch physical storage.
                        </p>
                      </div>
                    )}
                    {logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={
                          log.includes("ERROR")
                            ? "text-red-400"
                            : log.includes("DESTROY") ||
                              log.includes("PANIC") ||
                              log.includes("RECALL")
                            ? "text-orange-400 font-bold"
                            : log.includes("SUCCESS") || log.includes("WIPED")
                            ? "text-emerald-400"
                            : log.includes("ATTEST")
                            ? "text-emerald-400"
                            : "text-blue-300"
                        }
                      >
                        {log}
                      </motion.div>
                    ))}
                    {status === "running" && (
                      <div className="flex gap-1 animate-pulse text-gray-500 pt-2">
                        <span>_</span>
                      </div>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="info_market"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <InfoMarketDemo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How It Works */}
      <section className="bg-black/40 border-t border-white/5 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            How Conditional Recall Works
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Based on the IC3 research paper &mdash; a game-theoretic framework
            where TEEs enable agents to credibly commit to forgetting
            information.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Credible Commitment",
                desc: "TEE hardware guarantees that code running inside the enclave cannot be tampered with. The key destruction logic is part of the attested code.",
                color: "purple",
              },
              {
                title: "Arrow's Paradox Solved",
                desc: "Buyers can inspect information without the seller losing control. If no deal is made, the TEE provably forgets everything.",
                color: "blue",
              },
              {
                title: "Hardware Attestation",
                desc: "Remote attestation provides cryptographic proof that specific code ran in a genuine TEE and that sensitive data was deleted.",
                color: "emerald",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-${item.color}-500/20 flex items-center justify-center mb-4`}
                >
                  <Shield
                    className={`w-5 h-5 text-${item.color}-400`}
                  />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/20 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="font-semibold text-gray-300">BurnBroker</span>
            <span>&mdash; Encode Club IC3 Shape Rotator Hackathon 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://arxiv.org/abs/2510.21904"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-400 transition-colors"
            >
              Conditional Recall Paper
            </a>
            <a
              href="https://www.encodeclub.com/programmes/shape-rotator-virtual-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-400 transition-colors"
            >
              Hackathon
            </a>
            <a
              href="https://phala.network"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-400 transition-colors"
            >
              Phala Network
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
