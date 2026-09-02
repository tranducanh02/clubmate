import { KeyRound, LockKeyhole, Zap } from "lucide-react";
import Link from "next/link";
import { updatePassword } from "@/app/actions";

export default function ResetPasswordPage() {
  return <main className="reset-page"><Link className="brand-inline" href="/"><span><Zap size={21} fill="currentColor" /></span> ClubMate</Link><form action={updatePassword} className="workspace-card settings-form"><span className="form-icon"><KeyRound /></span><h1>Đặt mật khẩu mới</h1><p>Nhập mật khẩu mới cho tài khoản ClubMate của bạn.</p><label><LockKeyhole size={15} /> Mật khẩu mới<input name="password" type="password" minLength={6} required /></label><button className="dark-button">Cập nhật mật khẩu</button></form></main>;
}
