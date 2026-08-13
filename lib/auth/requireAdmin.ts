import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Call at the top of every admin page. Redirects non-admins away and
 * returns the current admin's profile for pages that need it.
 */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/pulse");
  }

  return { supabase, admin: profile };
}
