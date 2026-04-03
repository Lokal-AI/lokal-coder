import { createClient } from "@supabase/supabase-js";

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
  if (config.supabaseUrl && config.supabaseAnonKey) {
    supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
} catch (e) {
  console.error("Supabase init failed", e);
}

export const supabase = supabaseInstance;
