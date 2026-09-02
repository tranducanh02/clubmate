"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function loginUrl(message: string, type: "error" | "message" = "error") {
  return `/login?${type}=${encodeURIComponent(message)}`;
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(loginUrl("Supabase chưa được cấu hình."));

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(loginUrl("Email hoặc mật khẩu chưa đúng."));
  redirect("/");
}

export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(loginUrl("Supabase chưa được cấu hình."));

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");

  if (!fullName || !["male", "female"].includes(gender) || password.length < 6) {
    redirect(loginUrl("Vui lòng nhập đủ thông tin và mật khẩu tối thiểu 6 ký tự."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, gender } },
  });

  if (error) redirect(loginUrl(error.message));
  redirect(loginUrl("Kiểm tra email để xác nhận tài khoản ClubMate.", "message"));
}
