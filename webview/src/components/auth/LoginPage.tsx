import { motion } from "framer-motion";
import { ArrowRight, Github, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

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
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase might require email confirmation, typically handled by message
        setError("Check your email for confirmation!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-[var(--vscode-sideBar-background)] overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[320px] z-10"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_30px_rgb(14,165,233,0.3)] mb-6 relative group"
          >
            <Sparkles className="text-white w-7 h-7" />
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>

          <h1 className="text-xl font-black tracking-tight text-white mb-2 uppercase italic">
            Lokal Coder <span className="text-sky-400 not-italic">Studio</span>
          </h1>
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase tracking-[0.15em] opacity-60">
            Professional AI Engineering <br /> Workspace
          </p>
        </div>

        <motion.div
          layout
          className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl"
        >
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-[12px] focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 text-white placeholder:text-slate-600 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-[12px] focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 text-white placeholder:text-slate-600 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(14,165,233,0.3)] hover:shadow-[0_4px_25px_rgba(14,165,233,0.5)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Initialize Workspace" : "Enter Studio"}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest leading-none bg-transparent">
              <span className="px-2 text-slate-600">Enterprise Auth</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => socialLogin("github")}
              className="flex items-center justify-center gap-2 h-10 bg-white/[0.04] border border-white/5 rounded-xl hover:bg-white/[0.08] transition-all text-slate-400 hover:text-white"
            >
              <Github className="w-4 h-4" />
              <span className="text-[10px] font-bold">GitHub</span>
            </button>
            <button
              onClick={() => socialLogin("google")}
              className="flex items-center justify-center gap-2 h-10 bg-white/[0.04] border border-white/5 rounded-xl hover:bg-white/[0.08] transition-all text-slate-400 hover:text-white"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold">SSO</span>
            </button>
          </div>
        </motion.div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[11px] font-bold text-slate-500 hover:text-sky-400 transition-colors uppercase tracking-widest"
          >
            {isSignUp ? "Already have an account? Login" : "Don't have access? Request Invite"}
          </button>
        </div>
      </motion.div>

      <div className="mt-auto pb-4 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] z-10 flex items-center gap-3">
        <span>v0.1.0-alpha</span>
        <div className="w-1 h-1 rounded-full bg-sky-500/40" />
        <span>End-to-End Encrypted</span>
      </div>
    </div>
  );
}
