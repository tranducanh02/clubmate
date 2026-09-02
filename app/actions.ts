"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ViewName = "dashboard" | "sessions" | "members" | "balances" | "feed" | "settings" | "profile";

function destination(teamId?: string, view: ViewName = "dashboard", message?: string, error = false) {
  const params = new URLSearchParams();
  if (teamId) params.set("team", teamId);
  if (view !== "dashboard") params.set("view", view);
  if (message) params.set(error ? "error" : "message", message);
  return `/?${params.toString()}`;
}

async function viewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`Thiếu trường ${key}`);
  return value;
}

function optional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function safeError(error: { message?: string } | null, fallback: string) {
  return error?.message?.replace(/^.*?exception:\s*/i, "") || fallback;
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: "avatars" | "team-media",
  folder: string,
  value: FormDataEntryValue | null,
) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!value.type.startsWith("image/") || value.size > 8 * 1024 * 1024) {
    throw new Error("Ảnh phải nhỏ hơn 8MB và đúng định dạng ảnh.");
  }
  const extension = value.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, value, {
    contentType: value.type,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function signOut() {
  const { supabase } = await viewer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createTeam(formData: FormData) {
  const { supabase, user } = await viewer();
  const name = required(formData, "name");
  const { data: team, error } = await supabase.from("teams").insert({
    name,
    description: optional(formData, "description"),
    cover_url: "/og.png",
    auto_approve: formData.get("autoApprove") === "on",
    owner_id: user.id,
  }).select("id").single();
  if (error || !team) redirect(destination(undefined, "dashboard", safeError(error, "Không thể tạo đội."), true));

  try {
    const coverUrl = await uploadImage(supabase, "team-media", team.id, formData.get("cover"));
    if (coverUrl) await supabase.from("teams").update({ cover_url: coverUrl }).eq("id", team.id);
  } catch (uploadError) {
    redirect(destination(team.id, "settings", safeError(uploadError as Error, "Không thể tải ảnh bìa."), true));
  }
  revalidatePath("/");
  redirect(destination(team.id, "dashboard", "Đã tạo đội mới."));
}

export async function joinTeam(formData: FormData) {
  const { supabase } = await viewer();
  const { data, error } = await supabase.rpc("join_team", { p_invite_code: required(formData, "inviteCode") });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result) redirect(destination(undefined, "dashboard", safeError(error, "Không thể tham gia đội."), true));
  revalidatePath("/");
  const pending = result.membership_status === "pending";
  redirect(destination(result.team_id, "dashboard", pending ? "Yêu cầu đã gửi, đang chờ Owner duyệt." : "Bạn đã tham gia đội."));
}

export async function claimMember(formData: FormData) {
  const { supabase } = await viewer();
  const { data, error } = await supabase.rpc("claim_member", { p_claim_code: required(formData, "claimCode") });
  if (error || !data) redirect(destination(undefined, "dashboard", safeError(error, "Không thể nhận hồ sơ."), true));
  revalidatePath("/");
  redirect(destination(data, "dashboard", "Đã nhận hồ sơ và toàn bộ lịch sử cũ."));
}

export async function updateTeam(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const updates: Record<string, string | boolean | null> = {
    name: required(formData, "name"),
    description: optional(formData, "description"),
    auto_approve: formData.get("autoApprove") === "on",
    updated_at: new Date().toISOString(),
  };
  try {
    const coverUrl = await uploadImage(supabase, "team-media", teamId, formData.get("cover"));
    if (coverUrl) updates.cover_url = coverUrl;
  } catch (uploadError) {
    redirect(destination(teamId, "settings", safeError(uploadError as Error, "Không thể tải ảnh."), true));
  }
  const { error } = await supabase.from("teams").update(updates).eq("id", teamId);
  if (error) redirect(destination(teamId, "settings", safeError(error, "Không thể cập nhật đội."), true));
  revalidatePath("/");
  redirect(destination(teamId, "settings", "Đã cập nhật đội."));
}

export async function rotateInviteCode(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { data, error } = await supabase.rpc("rotate_team_invite_code", { p_team_id: teamId });
  if (error) redirect(destination(teamId, "settings", safeError(error, "Không thể đổi mã mời."), true));
  revalidatePath("/");
  redirect(destination(teamId, "settings", `Mã mời mới: ${data}`));
}

export async function addGhostMember(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    display_name: required(formData, "displayName"),
    gender: required(formData, "gender"),
    role: "member",
    status: "active",
  });
  if (error) redirect(destination(teamId, "members", safeError(error, "Không thể thêm thành viên."), true));
  revalidatePath("/");
  redirect(destination(teamId, "members", "Đã thêm thành viên chưa có tài khoản."));
}

export async function updateGhostMember(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const memberId = required(formData, "memberId");
  const { error } = await supabase.from("team_members").update({
    display_name: required(formData, "displayName"),
    gender: required(formData, "gender"),
  }).eq("id", memberId).is("user_id", null);
  if (error) redirect(destination(teamId, "members", safeError(error, "Không thể sửa thành viên."), true));
  revalidatePath("/");
  redirect(destination(teamId, "members", "Đã cập nhật thành viên."));
}

export async function approveMember(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.from("team_members").update({ status: "active" }).eq("id", required(formData, "memberId"));
  if (error) redirect(destination(teamId, "members", safeError(error, "Không thể duyệt thành viên."), true));
  revalidatePath("/");
  redirect(destination(teamId, "members", "Đã duyệt thành viên."));
}

export async function createClaimCode(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { data, error } = await supabase.rpc("create_member_claim_code", { p_member_id: required(formData, "memberId") });
  if (error) redirect(destination(teamId, "members", safeError(error, "Không thể tạo mã nhận."), true));
  revalidatePath("/");
  redirect(destination(teamId, "members", `Mã nhận (hết hạn sau 7 ngày): ${data}`));
}

export async function archiveMember(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.from("team_members").update({ archived_at: new Date().toISOString() })
    .eq("id", required(formData, "memberId")).neq("role", "owner");
  if (error) redirect(destination(teamId, "members", safeError(error, "Không thể xoá thành viên."), true));
  revalidatePath("/");
  redirect(destination(teamId, "members", "Đã xoá thành viên khỏi đội; lịch sử vẫn được giữ."));
}

export async function leaveTeam(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.rpc("leave_team", { p_team_id: teamId });
  if (error) redirect(destination(teamId, "settings", safeError(error, "Không thể rời đội."), true));
  revalidatePath("/");
  redirect(destination(undefined, "dashboard", "Bạn đã rời đội."));
}

export async function createSession(formData: FormData) {
  const { supabase, user } = await viewer();
  const teamId = required(formData, "teamId");
  const startsAt = new Date(`${required(formData, "date")}T${required(formData, "time")}:00`);
  const maxSlots = Number(formData.get("maxSlots")) || null;
  const { data: session, error } = await supabase.from("play_sessions").insert({
    team_id: teamId,
    sport: required(formData, "sport"),
    title: required(formData, "title"),
    starts_at: startsAt.toISOString(),
    location: required(formData, "location"),
    max_slots: maxSlots,
    created_by: user.id,
  }).select("id").single();
  if (error || !session) redirect(destination(teamId, "sessions", safeError(error, "Không thể tạo buổi chơi."), true));

  const { data: members } = await supabase.from("team_members").select("id").eq("team_id", teamId).eq("status", "active").is("archived_at", null);
  if (members?.length) await supabase.from("session_participants").insert(members.map((member) => ({ session_id: session.id, member_id: member.id })));
  try {
    const imageUrl = await uploadImage(supabase, "team-media", teamId, formData.get("image"));
    if (imageUrl) await supabase.from("play_sessions").update({ image_url: imageUrl }).eq("id", session.id);
  } catch (uploadError) {
    redirect(destination(teamId, "sessions", safeError(uploadError as Error, "Buổi đã tạo nhưng ảnh tải lên thất bại."), true));
  }
  revalidatePath("/");
  redirect(destination(teamId, "sessions", "Đã tạo buổi chơi."));
}

export async function deleteSession(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.from("play_sessions").delete().eq("id", required(formData, "sessionId"));
  if (error) redirect(destination(teamId, "sessions", safeError(error, "Không thể xoá buổi chơi."), true));
  revalidatePath("/");
  redirect(destination(teamId, "sessions", "Đã xoá buổi chơi."));
}

export async function updateSession(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const sessionId = required(formData, "sessionId");
  const startsAt = new Date(`${required(formData, "date")}T${required(formData, "time")}:00`);
  const updates: Record<string, string | number | null> = {
    title: required(formData, "title"),
    sport: required(formData, "sport"),
    starts_at: startsAt.toISOString(),
    location: required(formData, "location"),
    max_slots: Number(formData.get("maxSlots")) || null,
  };
  try {
    const imageUrl = await uploadImage(supabase, "team-media", teamId, formData.get("image"));
    if (imageUrl) updates.image_url = imageUrl;
  } catch (uploadError) {
    redirect(destination(teamId, "sessions", safeError(uploadError as Error, "Không thể tải ảnh."), true));
  }
  const { error } = await supabase.from("play_sessions").update(updates).eq("id", sessionId);
  if (error) redirect(destination(teamId, "sessions", safeError(error, "Không thể sửa buổi chơi."), true));
  revalidatePath("/");
  redirect(destination(teamId, "sessions", "Đã cập nhật buổi chơi."));
}

export async function setRsvp(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.rpc("rsvp_session", {
    p_session_id: required(formData, "sessionId"),
    p_status: required(formData, "status"),
  });
  if (error) redirect(destination(teamId, "sessions", safeError(error, "Không thể cập nhật RSVP."), true));
  revalidatePath("/");
  redirect(destination(teamId, "sessions", "Đã cập nhật RSVP."));
}

export async function addGuest(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.from("session_participants").insert({
    session_id: required(formData, "sessionId"),
    guest_name: required(formData, "guestName"),
    guest_gender: required(formData, "gender"),
  });
  if (error) redirect(destination(teamId, "sessions", safeError(error, "Không thể thêm khách."), true));
  revalidatePath("/");
  redirect(destination(teamId, "sessions", "Đã thêm người chơi vãng lai."));
}

export async function saveAttendance(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const allIds = formData.getAll("participantId").map(String);
  const attendedIds = new Set(formData.getAll("attended").map(String));
  const results = await Promise.all(allIds.map((id) => supabase.from("session_participants").update({ attended: attendedIds.has(id) }).eq("id", id)));
  const error = results.find((result) => result.error)?.error ?? null;
  if (error) redirect(destination(teamId, "sessions", safeError(error, "Không thể lưu điểm danh."), true));
  revalidatePath("/");
  redirect(destination(teamId, "sessions", "Đã lưu điểm danh thực tế."));
}

export async function finalizeCosts(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.rpc("finalize_session_costs", {
    p_session_id: required(formData, "sessionId"),
    p_court_cost: Number(formData.get("courtCost")) || 0,
    p_shuttle_cost: Number(formData.get("shuttleCost")) || 0,
    p_male_factor: Number(formData.get("maleFactor")) || 2,
  });
  if (error) redirect(destination(teamId, "sessions", safeError(error, "Không thể chốt chi phí."), true));
  revalidatePath("/");
  redirect(destination(teamId, "sessions", "Đã lưu chi phí vào lịch sử và cập nhật số dư."));
}

export async function updatePayment(formData: FormData) {
  const { supabase, user } = await viewer();
  const teamId = required(formData, "teamId");
  const month = `${required(formData, "month")}-01`;
  const { error } = await supabase.from("monthly_payments").upsert({
    team_id: teamId,
    member_id: required(formData, "memberId"),
    month,
    amount: Math.max(0, Number(formData.get("amount")) || 0),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "team_id,member_id,month" });
  if (error) redirect(destination(teamId, "balances", safeError(error, "Không thể cập nhật tiền đã đóng."), true));
  revalidatePath("/");
  redirect(`${destination(teamId, "balances", "Đã cập nhật tiền đã đóng.")}&month=${required(formData, "month")}`);
}

export async function createAnnouncement(formData: FormData) {
  const { supabase, user } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.from("announcements").insert({
    team_id: teamId,
    author_id: user.id,
    title: required(formData, "title"),
    content: required(formData, "content"),
    youtube_url: optional(formData, "youtubeUrl"),
  });
  if (error) redirect(destination(teamId, "feed", safeError(error, "Không thể đăng thông báo."), true));
  revalidatePath("/");
  redirect(destination(teamId, "feed", "Đã đăng thông báo."));
}

export async function addComment(formData: FormData) {
  const { supabase, user } = await viewer();
  const teamId = required(formData, "teamId");
  const { error } = await supabase.from("announcement_comments").insert({
    announcement_id: required(formData, "announcementId"),
    author_id: user.id,
    content: required(formData, "content"),
  });
  if (error) redirect(destination(teamId, "feed", safeError(error, "Không thể bình luận."), true));
  revalidatePath("/");
  redirect(destination(teamId, "feed", "Đã gửi bình luận."));
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await viewer();
  const updates: Record<string, string | null> = {
    full_name: required(formData, "fullName"),
    phone: optional(formData, "phone"),
    updated_at: new Date().toISOString(),
  };
  try {
    const avatarUrl = await uploadImage(supabase, "avatars", user.id, formData.get("avatar"));
    if (avatarUrl) updates.avatar_url = avatarUrl;
  } catch (uploadError) {
    redirect(destination(optional(formData, "teamId") ?? undefined, "profile", safeError(uploadError as Error, "Không thể tải avatar."), true));
  }
  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) redirect(destination(optional(formData, "teamId") ?? undefined, "profile", safeError(error, "Không thể cập nhật hồ sơ."), true));
  revalidatePath("/");
  redirect(destination(optional(formData, "teamId") ?? undefined, "profile", "Đã cập nhật hồ sơ."));
}

export async function updatePassword(formData: FormData) {
  const { supabase } = await viewer();
  const teamId = optional(formData, "teamId") ?? undefined;
  const password = required(formData, "password");
  if (password.length < 6) redirect(destination(teamId, "profile", "Mật khẩu cần tối thiểu 6 ký tự.", true));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(destination(teamId, "profile", safeError(error, "Không thể đổi mật khẩu."), true));
  redirect(destination(teamId, "profile", "Đã đổi mật khẩu."));
}
