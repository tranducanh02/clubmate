import { ArrowRight, LockKeyhole, Mail, UserRound, Zap } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requestPasswordReset, signIn, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand"><span><Zap size={24} fill="currentColor" /></span>ClubMate</div>
        <div>
          <p className="auth-kicker">DÀNH CHO MỌI ĐỘI THỂ THAO</p>
          <h1>Quản lý đội.<br />Lên sân vui hơn.</h1>
          <p>Lịch chơi, thành viên, điểm danh và quỹ đội — tất cả ở cùng một nơi.</p>
        </div>
        <div className="auth-sports"><span>Cầu lông</span><span>Pickleball</span><span>Đa nhóm</span></div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><Zap size={20} fill="currentColor" /> ClubMate</div>
          <p className="auth-eyebrow">CHÀO MỪNG TRỞ LẠI</p>
          <h2>Vào sân cùng đội bạn</h2>
          <p className="auth-subtitle">Đăng nhập hoặc tạo tài khoản mới trong vài giây.</p>

          {!configured && <div className="auth-alert warning">Chưa có Supabase URL/key. Giao diện đã sẵn sàng và sẽ hoạt động ngay sau khi thêm biến môi trường.</div>}
          {error && <div className="auth-alert error">{error}</div>}
          {message && <div className="auth-alert success">{message}</div>}

          <div className="auth-forms">
            <form action={signIn} className="auth-form">
              <h3>Đăng nhập</h3>
              <label><span><Mail size={16} /> Email</span><input name="email" type="email" required placeholder="ban@email.com" /></label>
              <label><span><LockKeyhole size={16} /> Mật khẩu</span><input name="password" type="password" minLength={6} required placeholder="Tối thiểu 6 ký tự" /></label>
              <button disabled={!configured}>Đăng nhập <ArrowRight size={18} /></button>
            </form>

            <details className="forgot-password"><summary>Quên mật khẩu?</summary><form action={requestPasswordReset}><input name="email" type="email" required placeholder="Email tài khoản" /><button disabled={!configured}>Gửi liên kết đặt lại</button></form></details>

            <div className="auth-divider"><span>HOẶC TẠO MỚI</span></div>

            <form action={signUp} className="auth-form compact">
              <label><span><UserRound size={16} /> Họ tên</span><input name="fullName" required placeholder="Nguyễn Minh Anh" /></label>
              <label><span><Mail size={16} /> Email</span><input name="email" type="email" required placeholder="ban@email.com" /></label>
              <label><span><LockKeyhole size={16} /> Mật khẩu</span><input name="password" type="password" minLength={6} required placeholder="Tối thiểu 6 ký tự" /></label>
              <fieldset><legend>Giới tính cố định</legend><label><input type="radio" name="gender" value="male" required /> Nam</label><label><input type="radio" name="gender" value="female" required /> Nữ</label></fieldset>
              <button disabled={!configured}>Tạo tài khoản <ArrowRight size={18} /></button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
