import logo from "@/assets/logo.png";
import { supabase } from "@lib/supabase";
import { motion } from "framer-motion";
import { ArrowRight, Github, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import React, { useState } from "react";

interface LoginPageProps {
  onSuccess?: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const auth = supabase?.auth;
      if (!auth) {
        throw new Error("Supabase is not configured. Please check your extension settings.");
      }
      if (isSignUp) {
        const { error } = await auth.signUp({ email, password });
        if (error) throw error;
        setError("Check your email for confirmation!");
      } else {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: "github" | "google") => {
    try {
      const auth = supabase?.auth;
      if (!auth) {
        throw new Error("Supabase is not configured. Please check your extension settings.");
      }
      const { error } = await auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-[#020202] overflow-hidden relative selection:bg-white/20">
      {/* Structural Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[280px] z-10"
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="mb-4 p-1 border border-white/5 rounded-2xl bg-white/[0.02]"
          >
            {logo ? (
              <img
                src={logo}
                alt="Lokal Coder Logo"
                className="w-9 h-9 grayscale invert brightness-200 contrast-125 object-contain"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/10 animate-pulse" />
            )}
          </motion.div>

          <h1 className="text-[13px] font-black tracking-[0.25em] text-white mb-1.5 uppercase">
            Lokal <span className="text-white/40 font-normal">Coder</span>
          </h1>
          <p className="text-[9px] font-medium text-white/30 leading-relaxed uppercase tracking-[0.15em]">
            Professional AI Engineering <br /> Studio
          </p>
        </div>

        <motion.div
          layout
          className="bg-[#0a0a0a] border border-white/[0.06] rounded-[28px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
        >
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">
                Identity
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-focus-within:text-white transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-[11px] focus:outline-none focus:border-white/20 focus:ring-0 text-white placeholder:text-white/10 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">
                Credentials
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-focus-within:text-white transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-[11px] focus:outline-none focus:border-white/20 focus:ring-0 text-white placeholder:text-white/10 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[9px] text-white/50 font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-white hover:bg-[#eeeeee] text-black rounded-xl font-black text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none shadow-[0_4px_20px_rgba(255,255,255,0.05)]"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Create Workspace" : "Enter Studio"}</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.04]"></div>
            </div>
            <div className="relative flex justify-center text-[7px] uppercase font-black tracking-[0.25em] leading-none bg-transparent">
              <span className="px-3 text-white/10">External Gateway</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => socialLogin("github")}
              className="flex items-center justify-center gap-2 h-9 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all text-white/40 hover:text-white group"
            >
              <Github className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span className="text-[9px] font-bold tracking-wider">GitHub</span>
            </button>
            <button
              onClick={() => socialLogin("google")}
              className="flex items-center justify-center gap-2 h-9 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all text-white/40 hover:text-white group"
            >
              <ShieldCheck className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span className="text-[9px] font-bold tracking-wider">SSO</span>
            </button>
          </div>
        </motion.div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[9px] font-black text-white/20 hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            {isSignUp ? "Return to Login" : "Initialize Fresh Environment"}
          </button>
        </div>
      </motion.div>

      <div className="mt-auto pb-4 text-[7px] text-white/10 font-black uppercase tracking-[0.3em] z-10 flex items-center gap-3">
        <span>EST. MMXXIV</span>
        <div className="w-0.5 h-0.5 rounded-full bg-white/20" />
        <span>Hardware Accelerated</span>
        <div className="w-0.5 h-0.5 rounded-full bg-white/20" />
        <span>E2E Encryption</span>
      </div>
    </div>
  );
}
