import { createClient } from "@supabase/supabase-js";
/* eslint-disable no-console */

// These are injected by the Extension host into the window object
declare global {
  interface Window {
    LOKAL_CONFIG: {
      supabaseUrl: string;
      supabaseAnonKey: string;
    };
  }
}

const config = window.LOKAL_CONFIG || {
  supabaseUrl: "",
  supabaseAnonKey: "",
};

// Safe initialization - don't crash the whole app if config is missing
let supabaseInstance: any = null;
try {
  const { supabaseUrl, supabaseAnonKey } = config;
  console.log("🛠️ Supabase initialization check:", {
    hasUrl: !!supabaseUrl,
    urlLength: supabaseUrl?.length,
    hasKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length,
  });

  if (
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "undefined" &&
    supabaseAnonKey !== "undefined"
  ) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log("✅ Supabase client initialized successfully.");
  } else {
    console.error(
      "❌ Supabase configuration is MISSING or INVALID. App will stay in 'Setup Required' state."
    );
  }
} catch (e) {
  console.error("❌ Supabase critical initialization error:", e);
}

export const supabase = supabaseInstance;
