import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useVsCodeApi } from "../hooks/useVsCodeApi";
import { supabase } from "../lib/supabase";

interface SessionContextType {
  session: any | null;
  user: any | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const vscode = useVsCodeApi();

  useEffect(() => {
    if (!supabase) return;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      console.warn("🔑 Initial session check:", session?.user?.id || "No user");
      setSession(session);
      if (session?.user?.id) {
        vscode.postMessage({ command: "setUser", payload: { userId: session.user.id } });
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      console.warn(`🔐 Auth state change [${event}]:`, session?.user?.id || "No user");
      setSession(session);
      if (session?.user?.id) {
        vscode.postMessage({ command: "setUser", payload: { userId: session.user.id } });
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [vscode]);

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, user: session?.user ?? null, isLoading, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
