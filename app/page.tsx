import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import type { ClubData, ViewName } from "@/lib/clubmate-types";
import { createClient } from "@/lib/supabase/server";

type HomeProps = {
  searchParams: Promise<{
    team?: string;
    view?: string;
    month?: string;
    message?: string;
    error?: string;
  }>;
};

const validViews = new Set<ViewName>(["dashboard", "sessions", "members", "balances", "feed", "settings", "profile"]);

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase.from("profiles")
    .select("id,full_name,gender,phone,avatar_url")
    .eq("id", user.id)
    .single();
  if (!rawProfile) redirect("/login?error=Không tìm thấy hồ sơ tài khoản.");

  const { data: rawMemberships } = await supabase.from("team_members")
    .select("id,team_id,user_id,display_name,gender,role,status,archived_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("joined_at");
  const memberships = rawMemberships ?? [];
  const teamIds = memberships.map((membership) => membership.team_id);
  const { data: rawTeams } = teamIds.length
    ? await supabase.from("teams").select("id,name,description,cover_url,invite_code,auto_approve,owner_id").in("id", teamIds)
    : { data: [] };
  const teams = rawTeams ?? [];
  const requestedTeam = teams.find((team) => team.id === params.team);
  const activeTeam = requestedTeam ?? teams.find((team) => memberships.find((membership) => membership.team_id === team.id)?.status === "active") ?? teams[0] ?? null;
  const activeMembership = memberships.find((membership) => membership.team_id === activeTeam?.id) ?? null;

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : defaultMonth;

  let members: ClubData["members"] = [];
  let sessions: ClubData["sessions"] = [];
  let participants: ClubData["participants"] = [];
  let costs: ClubData["costs"] = [];
  let payments: ClubData["payments"] = [];
  let announcements: ClubData["announcements"] = [];
  let comments: ClubData["comments"] = [];
  let authors: Record<string, string> = { [user.id]: rawProfile.full_name };

  if (activeTeam && activeMembership?.status === "active") {
    const [memberResult, sessionResult, paymentResult, announcementResult] = await Promise.all([
      supabase.from("team_members").select("id,team_id,user_id,display_name,gender,role,status,archived_at")
        .eq("team_id", activeTeam.id).is("archived_at", null).order("display_name"),
      supabase.from("play_sessions").select("id,team_id,sport,title,starts_at,location,max_slots,image_url,finalized_at")
        .eq("team_id", activeTeam.id).order("starts_at", { ascending: false }),
      supabase.from("monthly_payments").select("id,team_id,member_id,month,amount")
        .eq("team_id", activeTeam.id).order("month"),
      supabase.from("announcements").select("id,team_id,author_id,title,content,youtube_url,created_at")
        .eq("team_id", activeTeam.id).order("created_at", { ascending: false }),
    ]);
    members = memberResult.data ?? [];
    sessions = sessionResult.data ?? [];
    payments = paymentResult.data ?? [];
    announcements = announcementResult.data ?? [];

    const sessionIds = sessions.map((session) => session.id);
    const announcementIds = announcements.map((announcement) => announcement.id);
    const [participantResult, costResult, commentResult] = await Promise.all([
      sessionIds.length
        ? supabase.from("session_participants").select("id,session_id,member_id,guest_name,guest_gender,rsvp,attended,amount_due").in("session_id", sessionIds)
        : Promise.resolve({ data: [] }),
      sessionIds.length
        ? supabase.from("session_costs").select("session_id,court_cost,shuttle_cost,male_factor,saved_at").in("session_id", sessionIds)
        : Promise.resolve({ data: [] }),
      announcementIds.length
        ? supabase.from("announcement_comments").select("id,announcement_id,author_id,content,created_at").in("announcement_id", announcementIds).order("created_at")
        : Promise.resolve({ data: [] }),
    ]);
    participants = participantResult.data ?? [];
    costs = costResult.data ?? [];
    comments = commentResult.data ?? [];

    const authorIds = Array.from(new Set([...announcements.map((item) => item.author_id), ...comments.map((item) => item.author_id)]));
    if (authorIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", authorIds);
      authors = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
    }
  }

  const data: ClubData = {
    userId: user.id,
    profile: rawProfile,
    teams,
    memberships,
    activeTeam,
    activeMembership,
    members,
    sessions,
    participants,
    costs,
    payments,
    announcements,
    comments,
    authors,
    selectedMonth,
  };
  const view = validViews.has(params.view as ViewName) ? params.view as ViewName : "dashboard";
  return <DashboardClient data={data} view={view} message={params.message} error={params.error} />;
}
