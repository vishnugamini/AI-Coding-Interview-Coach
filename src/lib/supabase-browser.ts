"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl } from "@/lib/supabase";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
