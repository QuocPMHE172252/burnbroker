"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight } from "lucide-react";

export default function HeroSection({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) {
  return (
    <section className="relative py-24 px-4 text-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-6">
          <Shield className="w-4 h-4" />
          Encode Club IC3 Shape Rotator Hackathon
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
            Conditional Recall
          </span>
          <br />
          <span className="text-gray-100">for API Key Security</span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Delegate sensitive API keys to a Trusted Execution Environment. The
          TEE executes your strategy, then{" "}
          <span className="text-purple-300 font-semibold">
            unconditionally and irreversibly destroys
          </span>{" "}
          the key from memory &mdash; with cryptographic hardware proof.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-8 rounded-lg shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all"
          >
            Launch Dashboard <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="https://arxiv.org/abs/2510.21904"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-semibold py-3 px-8 rounded-lg transition-all"
          >
            Read the Paper
          </a>
        </div>
      </motion.div>

      {/* Flow diagram */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="max-w-4xl mx-auto mt-20"
      >
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-sm">
          {[
            { label: "User Encrypts Key", icon: "1" },
            { label: "Sent to TEE Enclave", icon: "2" },
            { label: "Strategy Executed", icon: "3" },
            { label: "Key Destroyed (0x00)", icon: "4" },
            { label: "Attestation Returned", icon: "5" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  {step.icon}
                </div>
                <span className="text-gray-300 whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              {i < 4 && (
                <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
