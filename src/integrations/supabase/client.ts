import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || SUPABASE_URL === "https://your-project-id.supabase.co") {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL is not set. " +
      "Copy .env.example to .env.local and fill in your Supabase project URL."
  );
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "your-anon-key-here") {
  console.warn(
    "[Supabase] VITE_SUPABASE_ANON_KEY is not set. " +
      "Copy .env.example to .env.local and fill in your Supabase anon key."
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export default supabase;
