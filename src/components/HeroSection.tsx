"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight, Lock, Fingerprint, Flame, ChevronRight } from "lucide-react";

const TRUST_BADGES = [
  { label: "AES-256 Encrypted", icon: Lock },
  { label: "TEE Hardware Isolated", icon: Shield },
  { label: "Zero-Retention Burn", icon: Flame },
  { label: "Remote Attestation", icon: Fingerprint },
];

const FLOW_STEPS = [
  {
    num: "01",
    title: "Encrypt",
    desc: "Client-side AES-256 encryption before credentials leave your browser",
  },
  {
    num: "02",
    title: "Isolate",
    desc: "Decrypted only inside a hardware-isolated TEE enclave",
  },
  {
    num: "03",
    title: "Execute",
    desc: "Single API call to Binance with HMAC-signed request",
  },
  {
    num: "04",
    title: "Destroy",
    desc: "RAM overwritten with 0x00, key permanently erased",
  },
  {
    num: "05",
    title: "Attest",
    desc: "Hardware-signed proof that destruction occurred",
  },
];

export default function HeroSection({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) {
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto relative z-10"
      >
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {TRUST_BADGES.map((badge) => (
            <div
              key={badge.label}
              className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1 text-[11px] text-gray-500 uppercase tracking-wider font-medium"
            >
              <badge.icon className="w-3 h-3" />
              {badge.label}
            </div>
          ))}
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center mb-6 leading-[1.1]">
          <span className="text-white">Execute Once.</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Destroy Forever.
          </span>
        </h1>

        <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed text-center">
          Securely delegate your exchange API keys to a hardware-isolated
          enclave. Your credentials are used for a single operation, then
          permanently destroyed with cryptographic proof.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all"
          >
            Start Delegation <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-semibold py-3 px-8 rounded-lg transition-all"
          >
            How It Works
          </a>
        </div>

        <p className="text-center text-xs text-gray-600 mb-16">
          Currently supporting Binance Spot API (testnet &amp; production)
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-5xl mx-auto relative z-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.06]">
          {FLOW_STEPS.map((step, i) => (
            <div
              key={step.num}
              className="bg-[#0c0c14] p-5 relative group hover:bg-white/[0.02] transition-colors"
            >
              <div className="text-[10px] font-mono text-purple-500/60 mb-2">
                {step.num}
              </div>
              <div className="text-sm font-semibold text-white mb-1">
                {step.title}
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                {step.desc}
              </div>
              {i < 4 && (
                <ChevronRight className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 text-gray-700 z-10" />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
