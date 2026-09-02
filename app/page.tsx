import DashboardClient from "./dashboard-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let viewerName = "Minh Nguyễn";
  let viewerRole: "Owner" | "Member" = "Owner";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const [{ data: profile }, { data: membership }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("team_members").select("role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
      ]);

      viewerName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || viewerName;
      viewerRole = membership?.role === "owner" ? "Owner" : "Member";
    }
  }

  return <DashboardClient viewerName={viewerName} viewerRole={viewerRole} />;
}
