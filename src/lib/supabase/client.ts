"use client";

import { createBrowserClient } from "@supabase/ssr";
import { hasBrowserSupabaseConfig } from "./env";

export function createClient() {
  if (!hasBrowserSupabaseConfig()) return null;
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
