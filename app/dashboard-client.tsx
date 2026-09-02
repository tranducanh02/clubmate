"use client";

import {
  Activity, ArrowRight, BadgeCheck, Bell, CalendarDays, Check, ChevronDown,
  CircleDollarSign, ClipboardCheck, Clock3, Copy, CreditCard, DoorOpen,
  ImagePlus, KeyRound, LayoutDashboard, Link2, LockKeyhole, LogOut, MapPin,
  Menu, MessageCircle, Newspaper, Plus, Save, Settings, ShieldCheck, Sparkles,
  Trophy, UserCheck, UserRound, Users, WalletCards, X, Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ClubData, ViewName } from "@/lib/clubmate-types";
import {
  addComment, addGhostMember, addGuest, approveMember, archiveMember, claimMember,
  createAnnouncement, createClaimCode, createSession, createTeam, deleteSession,
  finalizeCosts, joinTeam, leaveTeam, rotateInviteCode, saveAttendance, setRsvp,
  signOut, updateGhostMember, updatePassword, updatePayment, updateProfile, updateSession, updateTeam,
} from "./actions";

const navigation: Array<{ view: ViewName; label: string; icon: typeof LayoutDashboard }> = [
  { view: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { view: "sessions", label: "Lịch chơi", icon: CalendarDays },
  { view: "members", label: "Thành viên", icon: Users },
  { view: "balances", label: "Số dư", icon: WalletCards },
  { view: "feed", label: "Bảng tin", icon: Newspaper },
];

const viewTitles: Record<ViewName, string> = {
  dashboard: "Tổng quan", sessions: "Lịch chơi", members: "Thành viên",
  balances: "Số dư", feed: "Bảng tin", settings: "Cài đặt đội", profile: "Hồ sơ cá nhân",
};

const money = (value: number) => `${value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("vi-VN")}đ`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toUpperCase()).join("");
const dateText = (value: string) => new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const dayText = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(value));

function href(teamId: string | undefined, view: ViewName, extras?: Record<string, string>) {
  const params = new URLSearchParams();
  if (teamId) params.set("team", teamId);
  if (view !== "dashboard") params.set("view", view);
  Object.entries(extras ?? {}).forEach(([key, value]) => params.set(key, value));
  return `/?${params.toString()}`;
}

function YouTubeEmbed({ url }: { url: string }) {
  let id = "";
  try {
    const parsed = new URL(url);
    id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop() ?? "";
  } catch { return null; }
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  return <div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="Video thi đấu" allowFullScreen /></div>;
}

function Alert({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  return <div className={`workspace-alert ${error ? "is-error" : "is-success"}`}>{error ?? message}</div>;
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return <div className="empty-state"><span><Icon size={25} /></span><h3>{title}</h3><p>{text}</p></div>;
}

function Onboarding({ data, message, error }: { data: ClubData; message?: string; error?: string }) {
  return (
    <main className="onboarding-page">
      <header className="onboarding-head"><Link className="brand-inline" href="/"><span><Zap size={21} fill="currentColor" /></span> ClubMate</Link><div><Link href="/?view=profile"><UserRound size={18} /> {data.profile.full_name}</Link><form action={signOut}><button><LogOut size={17} /> Đăng xuất</button></form></div></header>
      <section className="onboarding-hero"><span className="eyebrow"><Sparkles size={15} /> BẮT ĐẦU CÙNG ĐỒNG ĐỘI</span><h1>Tạo đội mới hoặc<br />vào sân cùng bạn bè.</h1><p>Mỗi đội là một không gian riêng với thành viên, lịch, điểm danh và số dư độc lập.</p></section>
      <Alert message={message} error={error} />
      <section className="onboarding-grid">
        <form action={createTeam} className="feature-form lime-panel"><span className="form-icon"><Plus /></span><h2>Tạo đội mới</h2><p>Bạn sẽ trở thành Owner và có toàn quyền quản trị.</p><label>Tên đội<input name="name" required placeholder="Sài Gòn Smash Club" /></label><label>Mô tả<textarea name="description" placeholder="Lịch chơi và tinh thần của đội..." /></label><label>Ảnh bìa<input name="cover" type="file" accept="image/png,image/jpeg,image/webp" /></label><label className="check-row"><input name="autoApprove" type="checkbox" defaultChecked /> Tự động duyệt người dùng mã mời</label><button className="dark-button"><Plus size={17} /> Tạo đội</button></form>
        <div className="onboarding-stack">
          <form action={joinTeam} className="feature-form"><span className="form-icon pink"><Link2 /></span><h2>Tham gia bằng mã mời</h2><p>Nhập mã 6 ký tự do Owner của đội gửi.</p><label>Mã mời<input name="inviteCode" required minLength={6} maxLength={6} placeholder="ABC123" /></label><button className="primary-button"><ArrowRight size={17} /> Tham gia đội</button></form>
          <form action={claimMember} className="feature-form"><span className="form-icon yellow"><KeyRound /></span><h2>Nhận hồ sơ cũ</h2><p>Dùng mã nhận để gắn tài khoản vào ghost member và lấy lại lịch sử.</p><label>Mã nhận<input name="claimCode" required minLength={8} maxLength={8} placeholder="A1B2C3D4" /></label><button className="outline-button"><BadgeCheck size={17} /> Nhận hồ sơ</button></form>
        </div>
      </section>
    </main>
  );
}

function DashboardView({ data, isOwner }: { data: ClubData; isOwner: boolean }) {
  const teamId = data.activeTeam!.id;
  const month = data.selectedMonth;
  const monthSessions = data.sessions.filter((session) => session.starts_at.startsWith(month));
  const finalized = monthSessions.filter((session) => session.finalized_at);
  const monthSessionIds = new Set(finalized.map((session) => session.id));
  const activeMembers = data.members.filter((member) => member.status === "active");
  const monthDue = data.participants.filter((participant) => monthSessionIds.has(participant.session_id) && participant.member_id).reduce((sum, participant) => sum + (participant.amount_due ?? 0), 0);
  const monthPaid = data.payments.filter((payment) => payment.month.startsWith(month)).reduce((sum, payment) => sum + payment.amount, 0);
  const debt = Math.max(0, monthDue - monthPaid);
  const memberStats = activeMembers.map((member) => {
    const rows = data.participants.filter((participant) => participant.member_id === member.id && data.sessions.some((session) => session.id === participant.session_id && new Date(session.starts_at) < new Date()));
    const attended = rows.filter((row) => row.attended).length;
    return { member, attended, total: rows.length, rate: rows.length ? Math.round(attended / rows.length * 100) : 0 };
  }).sort((a, b) => b.rate - a.rate);
  const viewerMember = activeMembers.find((member) => member.user_id === data.userId);
  const viewerDue = data.participants.filter((participant) => participant.member_id === viewerMember?.id && monthSessionIds.has(participant.session_id)).reduce((sum, row) => sum + (row.amount_due ?? 0), 0);
  const viewerPaid = data.payments.find((payment) => payment.member_id === viewerMember?.id && payment.month.startsWith(month))?.amount ?? 0;
  const viewerTotalPaid = data.payments.filter((payment) => payment.member_id === viewerMember?.id).reduce((sum, payment) => sum + payment.amount, 0);
  const upcoming = [...data.sessions].filter((session) => new Date(session.starts_at) >= new Date()).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 3);
  const trend = Array.from({ length: 6 }, (_, index) => {
    const point = new Date();
    point.setDate(1);
    point.setMonth(point.getMonth() - (5 - index));
    const key = `${point.getFullYear()}-${String(point.getMonth() + 1).padStart(2, "0")}`;
    const ids = new Set(data.sessions.filter((session) => session.starts_at.startsWith(key)).map((session) => session.id));
    if (isOwner) {
      const rows = data.participants.filter((row) => ids.has(row.session_id) && row.member_id);
      return { label: `T${point.getMonth() + 1}`, value: rows.length ? Math.round(rows.filter((row) => row.attended).length / rows.length * 100) : 0 };
    }
    const due = data.participants.filter((row) => ids.has(row.session_id) && row.member_id === viewerMember?.id).reduce((sum, row) => sum + (row.amount_due ?? 0), 0);
    const paid = data.payments.find((payment) => payment.member_id === viewerMember?.id && payment.month.startsWith(key))?.amount ?? 0;
    return { label: `T${point.getMonth() + 1}`, value: paid - due };
  });
  const trendMax = Math.max(...trend.map((item) => Math.abs(item.value)), 1);

  return <>
    <section className="welcome-card real-welcome"><div className="welcome-copy"><span className="eyebrow"><Sparkles size={15} /> {isOwner ? "OWNER WORKSPACE" : "MEMBER WORKSPACE"}</span><h2>Chào {data.profile.full_name.split(/\s+/).at(-1)}!</h2><p>{isOwner ? `Bạn đang quản lý ${activeMembers.length} thành viên của ${data.activeTeam!.name}.` : `Mọi lịch chơi và số dư của bạn tại ${data.activeTeam!.name} đã sẵn sàng.`}</p><a href={href(teamId, "sessions")}>Xem lịch chơi <ArrowRight size={17} /></a></div><div className="welcome-metric"><Trophy size={31} /><strong>{isOwner ? `${memberStats[0]?.rate ?? 0}%` : money(viewerPaid - viewerDue)}</strong><span>{isOwner ? "tỷ lệ cao nhất" : "số dư tháng này"}</span></div></section>
    <section className="stats-grid">
      <article className="stat-card"><span className="stat-icon lime-soft"><CalendarDays /></span><div className="stat-copy"><span>Buổi trong tháng</span><strong>{monthSessions.length}</strong><small>{finalized.length} buổi đã chốt</small></div></article>
      <article className="stat-card"><span className="stat-icon pink-soft"><Users /></span><div className="stat-copy"><span>{isOwner ? "Thành viên hoạt động" : "Buổi đã tham gia"}</span><strong>{isOwner ? activeMembers.length : data.participants.filter((row) => row.member_id === viewerMember?.id && row.attended).length}</strong><small>Dựa trên điểm danh</small></div></article>
      <article className="stat-card"><span className="stat-icon yellow-soft"><CircleDollarSign /></span><div className="stat-copy"><span>{isOwner ? "Tổng đã thu" : "Tổng đã đóng"}</span><strong>{money(isOwner ? monthPaid : viewerTotalPaid)}</strong><small>{isOwner ? `Bảng tháng ${month.split("-").reverse().join("/")}` : "Tất cả các tháng"}</small></div></article>
      <article className="stat-card"><span className="stat-icon peach-soft"><CreditCard /></span><div className="stat-copy"><span>{isOwner ? "Tổng đang nợ" : "Cần thanh toán"}</span><strong>{money(isOwner ? debt : Math.max(0, viewerDue - viewerPaid))}</strong><small>Không cộng dồn tháng trước</small></div></article>
    </section>
    <section className="workspace-card trend-card"><div className="card-title"><div><span><Activity size={19} /></span><div><h3>{isOwner ? "Điểm danh theo tháng" : "Số dư theo tháng"}</h3><p>6 tháng gần nhất · {isOwner ? "tỷ lệ có mặt" : "cột xanh dương, cột đỏ âm"}</p></div></div></div><div className="trend-bars">{trend.map((item) => <div key={item.label}><span>{isOwner ? `${item.value}%` : money(item.value)}</span><i className={item.value < 0 ? "negative-bar" : ""} style={{ height: `${Math.max(5, Math.abs(item.value) / trendMax * 100)}%` }} /><small>{item.label}</small></div>)}</div></section>
    <section className="two-column-grid">
      <article className="workspace-card"><div className="card-title"><div><span><Activity size={19} /></span><div><h3>Tỷ lệ tham gia</h3><p>Dựa trên điểm danh thực tế</p></div></div><a href={href(teamId, "members")}>Chi tiết <ArrowRight size={15} /></a></div>{memberStats.length ? <><div className="ranking-extremes"><span><Trophy size={14} /> Đi đều nhất: <strong>{memberStats[0]?.member.display_name}</strong></span><span><UserRound size={14} /> Hay vắng nhất: <strong>{memberStats.at(-1)?.member.display_name}</strong></span></div><div className="ranking-list">{memberStats.slice(0, 6).map((row, index) => <div key={row.member.id}><span className="rank">#{index + 1}</span><span className="avatar avatar-green">{initials(row.member.display_name)}</span><span className="rank-name"><strong>{row.member.display_name}</strong><small>{row.attended}/{row.total} buổi</small></span><div className="progress"><i style={{ width: `${row.rate}%` }} /></div><strong>{row.rate}%</strong></div>)}</div></> : <EmptyState icon={Activity} title="Chưa có dữ liệu" text="Tỷ lệ sẽ xuất hiện sau khi Owner điểm danh." />}</article>
      <article className="workspace-card"><div className="card-title"><div><span><CalendarDays size={19} /></span><div><h3>Buổi sắp tới</h3><p>RSVP ngay để giữ chỗ</p></div></div><a href={href(teamId, "sessions")}>Xem lịch <ArrowRight size={15} /></a></div>{upcoming.length ? <div className="compact-session-list">{upcoming.map((session) => <a href={href(teamId, "sessions")} key={session.id}><span className={`sport-dot ${session.sport}`} /><div><strong>{session.title}</strong><small>{dateText(session.starts_at)} · {session.location}</small></div><ArrowRight size={16} /></a>)}</div> : <EmptyState icon={CalendarDays} title="Chưa có lịch sắp tới" text={isOwner ? "Hãy tạo buổi chơi đầu tiên." : "Owner chưa tạo lịch mới."} />}</article>
    </section>
  </>;
}

function SessionsView({ data, isOwner }: { data: ClubData; isOwner: boolean }) {
  const teamId = data.activeTeam!.id;
  const memberMap = new Map(data.members.map((member) => [member.id, member]));
  const viewerMember = data.members.find((member) => member.user_id === data.userId);
  const ordered = [...data.sessions].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return <div className="workspace-layout with-aside">
    <section className="workspace-main"><div className="section-intro"><div><h2>Lịch và điểm danh</h2><p>RSVP chỉ là dự kiến; điểm danh thực tế là dữ liệu tính tiền.</p></div></div>{ordered.length ? <div className="session-list">{ordered.map((session) => {
      const rows = data.participants.filter((participant) => participant.session_id === session.id);
      const going = rows.filter((row) => row.rsvp === "going").length;
      const attended = rows.filter((row) => row.attended);
      const viewerRsvp = rows.find((row) => row.member_id === viewerMember?.id)?.rsvp;
      const cost = data.costs.find((item) => item.session_id === session.id);
      const maleCount = attended.filter((row) => (row.member_id ? memberMap.get(row.member_id)?.gender : row.guest_gender) === "male").length;
      const femaleCount = attended.length - maleCount;
      return <article className="session-detail-card" key={session.id}>
        <div className="session-summary"><div className={`date-block ${session.sport}`}><strong>{new Date(session.starts_at).getDate()}</strong><span>THG {new Date(session.starts_at).getMonth() + 1}</span></div><div><span className="sport-label">{session.sport === "badminton" ? "CẦU LÔNG" : "PICKLEBALL"}</span><h3>{session.title}</h3><p><Clock3 size={15} /> {dateText(session.starts_at)}</p><p><MapPin size={15} /> {session.location}</p></div><div className="session-status"><strong>{going}{session.max_slots ? `/${session.max_slots}` : ""}</strong><span>đã RSVP đi</span>{session.finalized_at && <em><ShieldCheck size={13} /> Đã chốt</em>}</div></div>
        {session.image_url && <a className="session-image" href={session.image_url} target="_blank" rel="noreferrer" style={{ backgroundImage: `url(${session.image_url})` }} aria-label="Mở ảnh buổi chơi" />}
        {!session.finalized_at && <div className="rsvp-strip"><span>Phản hồi của bạn</span><form action={setRsvp}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="sessionId" value={session.id} /><button name="status" value="going" className={viewerRsvp === "going" ? "active yes" : ""}><Check size={15} /> Đi</button><button name="status" value="not_going" className={viewerRsvp === "not_going" ? "active no" : ""}><X size={15} /> Không đi</button></form></div>}
        <details className="session-expand"><summary><ClipboardCheck size={16} /> Chi tiết người chơi và chi phí <ChevronDown size={16} /></summary>
          <div className="session-inner">
            <div><h4>Người chơi ({rows.length})</h4>{isOwner && !session.finalized_at ? <form action={saveAttendance} className="attendance-form"><input type="hidden" name="teamId" value={teamId} />{rows.map((row) => { const member = row.member_id ? memberMap.get(row.member_id) : null; const name = member?.display_name ?? row.guest_name ?? "Khách"; const gender = member?.gender ?? row.guest_gender; return <label key={row.id}><input type="hidden" name="participantId" value={row.id} /><input type="checkbox" name="attended" value={row.id} defaultChecked={row.attended} /><span className="avatar avatar-yellow">{initials(name)}</span><span><strong>{name}</strong><small>{gender === "male" ? "Nam" : "Nữ"}{!member ? " · Khách" : ""}</small></span>{row.rsvp && <em>{row.rsvp === "going" ? "RSVP Đi" : "Không đi"}</em>}</label>})}<button className="outline-button"><Save size={15} /> Lưu điểm danh</button></form> : <div className="attendance-readonly">{rows.filter((row) => row.attended).map((row) => { const member = row.member_id ? memberMap.get(row.member_id) : null; const name = member?.display_name ?? row.guest_name ?? "Khách"; return <span key={row.id}><Check size={13} /> {name}{row.amount_due !== null ? ` · ${money(row.amount_due)}` : ""}</span>})}{!attended.length && <small>Chưa điểm danh.</small>}</div>}</div>
            <div>{isOwner && !session.finalized_at && <><details className="session-editor"><summary><Settings size={14} /> Sửa thông tin buổi</summary><form action={updateSession}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="sessionId" value={session.id} /><input name="title" required defaultValue={session.title} /><div className="form-split"><select name="sport" defaultValue={session.sport}><option value="badminton">Cầu lông</option><option value="pickleball">Pickleball</option></select><input name="maxSlots" type="number" min="2" defaultValue={session.max_slots ?? ""} placeholder="Số slot" /></div><div className="form-split"><input name="date" type="date" required defaultValue={new Date(session.starts_at).toLocaleDateString("en-CA")} /><input name="time" type="time" required defaultValue={new Date(session.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })} /></div><input name="location" required defaultValue={session.location} /><input name="image" type="file" accept="image/png,image/jpeg,image/webp" /><button className="outline-button"><Save size={14} /> Lưu thay đổi</button></form></details><h4>Thêm khách vãng lai</h4><form action={addGuest} className="inline-form"><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="sessionId" value={session.id} /><input name="guestName" required placeholder="Tên người chơi" /><select name="gender"><option value="male">Nam</option><option value="female">Nữ</option></select><button><Plus size={15} /></button></form><h4>Chốt chi phí</h4><form action={finalizeCosts} className="cost-form"><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="sessionId" value={session.id} /><label>Tiền sân<input type="number" name="courtCost" min="0" step="1000" required /></label><label>Tiền cầu<input type="number" name="shuttleCost" min="0" step="1000" required /></label><div className="attendance-count"><span>Nam <strong>{maleCount}</strong></span><span>Nữ <strong>{femaleCount}</strong></span></div><fieldset><legend>Hệ số nam / nữ</legend>{[1, 1.5, 2].map((factor) => <label key={factor}><input type="radio" name="maleFactor" value={factor} defaultChecked={factor === 2} /> {String(factor).replace(".", ",")}</label>)}</fieldset><button className="primary-button"><CircleDollarSign size={16} /> Lưu vào lịch sử</button></form></>}{cost && <div className="cost-summary"><h4>Chi phí đã lưu</h4><p><span>Tiền sân</span><strong>{money(cost.court_cost)}</strong></p><p><span>Tiền cầu</span><strong>{money(cost.shuttle_cost)}</strong></p>{isOwner && <p><span>Hệ số nam/nữ</span><strong>{String(cost.male_factor).replace(".", ",")}</strong></p>}</div>}</div>
          </div>
        </details>
        {isOwner && <form action={deleteSession} className="danger-inline"><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="sessionId" value={session.id} /><button><X size={14} /> Xoá buổi</button></form>}
      </article>;
    })}</div> : <EmptyState icon={CalendarDays} title="Chưa có buổi chơi" text="Tạo lịch đầu tiên để cả đội RSVP." />}</section>
    <aside className="workspace-aside">{isOwner ? <form action={createSession} className="feature-form sticky-form"><span className="form-icon"><Plus /></span><h2>Tạo buổi chơi</h2><input type="hidden" name="teamId" value={teamId} /><label>Tên buổi<input name="title" required placeholder="Cầu lông tối thứ Sáu" /></label><div className="form-split"><label>Môn<select name="sport"><option value="badminton">Cầu lông</option><option value="pickleball">Pickleball</option></select></label><label>Số slot<input name="maxSlots" type="number" min="2" placeholder="Không giới hạn" /></label></div><div className="form-split"><label>Ngày<input name="date" type="date" required /></label><label>Giờ<input name="time" type="time" required /></label></div><label>Địa điểm<input name="location" required placeholder="Tên sân, quận..." /></label><label><ImagePlus size={14} /> Ảnh buổi chơi<input name="image" type="file" accept="image/png,image/jpeg,image/webp" /></label><button className="dark-button"><Plus size={16} /> Tạo lịch</button></form> : <div className="info-panel"><ShieldCheck /><h3>Dữ liệu minh bạch</h3><p>Chi phí chỉ được tính từ danh sách Owner đã điểm danh thực tế.</p></div>}</aside>
  </div>;
}

function MembersView({ data, isOwner }: { data: ClubData; isOwner: boolean }) {
  const teamId = data.activeTeam!.id;
  const pending = data.members.filter((member) => member.status === "pending");
  const active = data.members.filter((member) => member.status === "active");
  return <div className="workspace-layout with-aside"><section className="workspace-main"><div className="section-intro"><div><h2>{active.length} thành viên</h2><p>Người có tài khoản và ghost member dùng chung một lịch sử.</p></div>{isOwner && <span className="invite-chip"><Link2 size={15} /> Mã mời: <strong>{data.activeTeam!.invite_code}</strong></span>}</div>
    {isOwner && pending.length > 0 && <div className="pending-panel"><h3><UserCheck size={18} /> Chờ duyệt ({pending.length})</h3>{pending.map((member) => <div key={member.id}><span className="avatar avatar-pink">{initials(member.display_name)}</span><strong>{member.display_name}</strong><span>{member.gender === "male" ? "Nam" : "Nữ"}</span><form action={approveMember}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="memberId" value={member.id} /><button><Check size={15} /> Duyệt</button></form></div>)}</div>}
    <div className="member-table"><div className="table-head"><span>Thành viên</span><span>Loại</span><span>Vai trò</span><span>Thao tác</span></div>{active.map((member) => <div className="member-row" key={member.id}><div><span className="avatar avatar-green">{initials(member.display_name)}</span><span><strong>{member.display_name}</strong><small>{member.gender === "male" ? "Nam" : "Nữ"}</small></span></div><span><em className={member.user_id ? "real-badge" : "ghost-badge"}>{member.user_id ? "Tài khoản" : "Ghost"}</em></span><span>{member.role === "owner" ? "Owner" : "Member"}</span><span>{isOwner && member.role !== "owner" ? <details className="row-actions"><summary><Settings size={16} /> Quản lý</summary><div>{!member.user_id && <><form action={updateGhostMember}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="memberId" value={member.id} /><input name="displayName" defaultValue={member.display_name} required /><select name="gender" defaultValue={member.gender}><option value="male">Nam</option><option value="female">Nữ</option></select><button><Save size={14} /> Lưu</button></form><form action={createClaimCode}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="memberId" value={member.id} /><button><KeyRound size={14} /> Tạo mã nhận</button></form></>}<form action={archiveMember}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="memberId" value={member.id} /><button className="danger-text"><X size={14} /> Xoá khỏi đội</button></form></div></details> : <span className="muted">—</span>}</span></div>)}</div>
  </section><aside className="workspace-aside">{isOwner ? <form action={addGhostMember} className="feature-form sticky-form"><span className="form-icon pink"><UserRound /></span><h2>Thêm ghost member</h2><p>Dành cho người chơi chưa dùng ClubMate.</p><input type="hidden" name="teamId" value={teamId} /><label>Họ tên<input name="displayName" required placeholder="Tên thành viên" /></label><label>Giới tính<select name="gender"><option value="male">Nam</option><option value="female">Nữ</option></select></label><button className="dark-button"><Plus size={16} /> Thêm thành viên</button></form> : <div className="info-panel"><Users /><h3>Đội của bạn</h3><p>Liên hệ Owner nếu cần cập nhật thông tin thành viên.</p></div>}</aside></div>;
}

function BalancesView({ data, isOwner }: { data: ClubData; isOwner: boolean }) {
  const teamId = data.activeTeam!.id;
  const finalizedSessions = data.sessions.filter((session) => session.finalized_at && session.starts_at.startsWith(data.selectedMonth)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const visibleMembers = data.members.filter((member) => member.status === "active" && (isOwner || member.user_id === data.userId));
  const monthLabel = data.selectedMonth.split("-").reverse().join("/");
  return <section className="workspace-main full"><div className="section-intro"><div><h2>Số dư tháng {monthLabel}</h2><p>Mỗi tháng độc lập, không cộng dồn số dư.</p></div><form className="month-picker"><input type="hidden" name="team" value={teamId} /><input type="hidden" name="view" value="balances" /><input type="month" name="month" defaultValue={data.selectedMonth} /><button>Xem tháng</button></form></div>
    <div className="balance-table-wrap"><table className="balance-table"><thead><tr><th>Thành viên</th><th>Đã đóng</th>{finalizedSessions.map((session) => <th key={session.id}>{dayText(session.starts_at)}</th>)}<th>Số dư</th></tr></thead><tbody>{visibleMembers.map((member) => { const payment = data.payments.find((item) => item.member_id === member.id && item.month.startsWith(data.selectedMonth))?.amount ?? 0; const sessionAmounts = finalizedSessions.map((session) => data.participants.find((row) => row.session_id === session.id && row.member_id === member.id)?.amount_due ?? 0); const due = sessionAmounts.reduce((sum, amount) => sum + amount, 0); const balance = payment - due; return <tr key={member.id}><td><span className="avatar avatar-green">{initials(member.display_name)}</span><strong>{member.display_name}</strong></td><td>{isOwner ? <form action={updatePayment} className="payment-form"><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="memberId" value={member.id} /><input type="hidden" name="month" value={data.selectedMonth} /><input name="amount" type="number" min="0" step="1000" defaultValue={payment} /><button aria-label="Lưu tiền đã đóng"><Save size={14} /></button></form> : money(payment)}</td>{sessionAmounts.map((amount, index) => <td key={`${member.id}-${finalizedSessions[index].id}`}>{amount ? money(amount) : "—"}</td>)}<td><strong className={balance >= 0 ? "positive" : "negative"}>{money(balance)}</strong></td></tr>; })}</tbody></table>{!visibleMembers.length && <EmptyState icon={WalletCards} title="Chưa có số dư" text="Dữ liệu sẽ xuất hiện sau khi chốt một buổi chơi." />}</div>
    <div className="history-card"><h3>Lịch sử buổi đã chốt</h3>{finalizedSessions.map((session) => { const cost = data.costs.find((item) => item.session_id === session.id); return <div key={session.id}><span>{dayText(session.starts_at)}</span><strong>{session.title}</strong><span>{cost ? money(cost.court_cost + cost.shuttle_cost) : "—"}</span>{isOwner && <span>Hệ số {String(cost?.male_factor ?? "—").replace(".", ",")}</span>}</div>; })}{!finalizedSessions.length && <p>Tháng này chưa có buổi nào được lưu vào lịch sử.</p>}</div>
  </section>;
}

function FeedView({ data, isOwner }: { data: ClubData; isOwner: boolean }) {
  const teamId = data.activeTeam!.id;
  return <div className="workspace-layout with-aside"><section className="workspace-main"><div className="section-intro"><div><h2>Bảng tin đội</h2><p>Thông báo, video thi đấu và phản hồi của thành viên.</p></div></div><div className="feed-list">{data.announcements.map((post) => { const postComments = data.comments.filter((comment) => comment.announcement_id === post.id); return <article className="post-card" key={post.id}><div className="post-author"><span className="avatar avatar-pink">{initials(data.authors[post.author_id] ?? "CM")}</span><div><strong>{data.authors[post.author_id] ?? "Thành viên"}</strong><small>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.created_at))}</small></div></div><h3>{post.title}</h3><p>{post.content}</p>{post.youtube_url && <YouTubeEmbed url={post.youtube_url} />}<div className="comments"><h4><MessageCircle size={15} /> {postComments.length} bình luận</h4>{postComments.map((comment) => <div key={comment.id}><span className="avatar avatar-yellow">{initials(data.authors[comment.author_id] ?? "TV")}</span><p><strong>{data.authors[comment.author_id] ?? "Thành viên"}</strong>{comment.content}</p></div>)}<form action={addComment}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="announcementId" value={post.id} /><input name="content" required placeholder="Viết phản hồi..." /><button aria-label="Gửi bình luận"><ArrowRight size={16} /></button></form></div></article>; })}{!data.announcements.length && <EmptyState icon={Newspaper} title="Bảng tin còn trống" text={isOwner ? "Đăng thông báo đầu tiên cho đội." : "Owner chưa đăng thông báo."} />}</div></section><aside className="workspace-aside">{isOwner ? <form action={createAnnouncement} className="feature-form sticky-form"><span className="form-icon yellow"><Bell /></span><h2>Đăng thông báo</h2><input type="hidden" name="teamId" value={teamId} /><label>Tiêu đề<input name="title" required placeholder="Lịch tuần này" /></label><label>Nội dung<textarea name="content" required rows={5} placeholder="Thông tin dành cho cả đội..." /></label><label>Link YouTube<input name="youtubeUrl" type="url" placeholder="https://youtube.com/watch?v=..." /></label><button className="dark-button"><Newspaper size={16} /> Đăng lên bảng tin</button></form> : <div className="info-panel"><MessageCircle /><h3>Cùng trò chuyện</h3><p>Bạn có thể bình luận dưới mọi thông báo của đội.</p></div>}</aside></div>;
}

function CreateAnotherTeam() {
  return <form action={createTeam} className="workspace-card settings-form"><span className="form-icon"><Plus /></span><h2>Tạo thêm đội</h2><p>Một tài khoản có thể quản lý hoặc tham gia nhiều đội độc lập.</p><label>Tên đội<input name="name" required placeholder="Tên đội mới" /></label><label>Mô tả<textarea name="description" rows={3} /></label><label>Ảnh bìa<input name="cover" type="file" accept="image/png,image/jpeg,image/webp" /></label><label className="check-row"><input name="autoApprove" type="checkbox" defaultChecked /> Tự động duyệt mã mời</label><button className="dark-button"><Plus size={16} /> Tạo đội mới</button></form>;
}

function JoinAnotherTeam() {
  return <div className="workspace-card settings-form"><span className="form-icon pink"><Link2 /></span><h2>Tham gia đội khác</h2><form action={joinTeam} className="mini-join-form"><label>Mã mời 6 ký tự<input name="inviteCode" required minLength={6} maxLength={6} /></label><button className="primary-button"><ArrowRight size={15} /> Tham gia</button></form><form action={claimMember} className="mini-join-form"><label>Mã nhận ghost member<input name="claimCode" required minLength={8} maxLength={8} /></label><button className="outline-button"><BadgeCheck size={15} /> Nhận hồ sơ</button></form></div>;
}

function SettingsView({ data, isOwner }: { data: ClubData; isOwner: boolean }) {
  const team = data.activeTeam!;
  if (!isOwner) return <section className="settings-grid"><div className="workspace-card"><h2>Thông tin đội</h2><p>{team.description || "Chưa có mô tả."}</p><div className="invite-display"><Link2 /><span>Mã mời</span><strong>{team.invite_code}</strong></div><form action={leaveTeam}><input type="hidden" name="teamId" value={team.id} /><button className="danger-button"><DoorOpen size={16} /> Rời đội</button></form></div><CreateAnotherTeam /><JoinAnotherTeam /></section>;
  return <section className="settings-grid"><form action={updateTeam} className="workspace-card settings-form"><h2>Cài đặt đội</h2><input type="hidden" name="teamId" value={team.id} /><label>Tên đội<input name="name" required defaultValue={team.name} /></label><label>Mô tả<textarea name="description" rows={4} defaultValue={team.description ?? ""} /></label><label>Ảnh bìa mới<input name="cover" type="file" accept="image/png,image/jpeg,image/webp" /></label><label className="check-row"><input name="autoApprove" type="checkbox" defaultChecked={team.auto_approve} /> Tự động duyệt thành viên mới</label><button className="primary-button"><Save size={16} /> Lưu cài đặt</button></form><div className="workspace-card"><h2>Mời thành viên</h2><p>Mã mời dùng cho người hoàn toàn mới. Ghost member cần mã nhận riêng.</p><div className="invite-display"><Copy /><span>Mã hiện tại</span><strong>{team.invite_code}</strong></div><form action={rotateInviteCode}><input type="hidden" name="teamId" value={team.id} /><button className="outline-button"><KeyRound size={16} /> Đổi mã mời</button></form><div className="security-note"><ShieldCheck /><p><strong>Không gian riêng tư</strong>RLS đảm bảo dữ liệu của đội tách biệt với các đội khác.</p></div></div><CreateAnotherTeam /><JoinAnotherTeam /></section>;
}

function ProfileView({ data }: { data: ClubData }) {
  return <section className="settings-grid"><form action={updateProfile} className="workspace-card settings-form"><h2>Hồ sơ cá nhân</h2>{data.profile.avatar_url ? <span className="profile-avatar-image" style={{ backgroundImage: `url(${data.profile.avatar_url})` }} /> : <span className="profile-avatar-image fallback">{initials(data.profile.full_name)}</span>}<input type="hidden" name="teamId" value={data.activeTeam?.id ?? ""} /><label>Họ tên<input name="fullName" required defaultValue={data.profile.full_name} /></label><label>Số điện thoại<input name="phone" type="tel" defaultValue={data.profile.phone ?? ""} placeholder="09xx xxx xxx" /></label><label>Giới tính<input value={data.profile.gender === "male" ? "Nam" : "Nữ"} disabled /></label><small className="field-note"><LockKeyhole size={13} /> Giới tính cố định từ lúc đăng ký vì được dùng để tính tiền.</small><label>Avatar mới<input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" /></label><button className="primary-button"><Save size={16} /> Cập nhật hồ sơ</button></form><form action={updatePassword} className="workspace-card settings-form"><h2>Đổi mật khẩu</h2><input type="hidden" name="teamId" value={data.activeTeam?.id ?? ""} /><label>Mật khẩu mới<input name="password" type="password" minLength={6} required placeholder="Tối thiểu 6 ký tự" /></label><button className="dark-button"><KeyRound size={16} /> Đổi mật khẩu</button></form></section>;
}

type Props = { data: ClubData; view: ViewName; message?: string; error?: string };

export default function DashboardClient({ data, view, message, error }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const isOwner = data.activeMembership?.role === "owner";
  const activeTeam = data.activeTeam;
  const activeMembership = data.activeMembership;
  const unread = data.announcements.length;
  const teamInitials = useMemo(() => initials(activeTeam?.name ?? "ClubMate"), [activeTeam?.name]);

  if (!activeTeam && view === "profile") return <main className="onboarding-page"><header className="onboarding-head"><Link className="brand-inline" href="/"><span><Zap size={21} fill="currentColor" /></span> ClubMate</Link><form action={signOut}><button><LogOut size={17} /> Đăng xuất</button></form></header><div className="standalone-profile"><Alert message={message} error={error} /><ProfileView data={data} /></div></main>;
  if (!activeTeam) return <Onboarding data={data} message={message} error={error} />;
  if (activeMembership?.status === "pending") return <main className="pending-page"><Link className="brand-inline" href="/"><span><Zap size={21} fill="currentColor" /></span> ClubMate</Link><div><span className="pending-icon"><Clock3 /></span><h1>Đang chờ Owner duyệt</h1><p>Yêu cầu tham gia <strong>{activeTeam.name}</strong> đã được gửi. Bạn sẽ truy cập được dữ liệu đội sau khi được duyệt.</p><Link href="/">Kiểm tra lại <ArrowRight size={16} /></Link></div><form action={signOut}><button><LogOut size={16} /> Đăng xuất</button></form></main>;

  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}><div className="brand-row"><div className="brand-mark"><Zap size={22} fill="currentColor" /></div><span className="brand-name">ClubMate</span><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X size={20} /></button></div>
      <div className="team-switcher-wrap"><button className="team-switcher" onClick={() => setTeamOpen(!teamOpen)}><span className="team-badge">{teamInitials}</span><span><small>Đội của bạn</small><strong>{activeTeam.name}</strong></span><ChevronDown size={17} /></button>{teamOpen && <div className="team-menu">{data.teams.map((team) => <a key={team.id} href={href(team.id, "dashboard")}>{team.name}{team.id === activeTeam.id && <Check size={15} />}</a>)}<Link className="new-team" href="/?view=profile"><Plus size={15} /> Quản lý tài khoản</Link></div>}</div>
      <nav className="main-nav"><p className="nav-kicker">QUẢN LÝ ĐỘI</p>{navigation.map(({ view: itemView, label, icon: Icon }) => <a key={itemView} className={view === itemView ? "nav-active" : ""} href={href(activeTeam.id, itemView)}><Icon size={20} /><span>{label}</span>{itemView === "feed" && unread > 0 && <span className="nav-count">{unread}</span>}</a>)}</nav>
      <div className="sidebar-footer"><a className={view === "settings" ? "nav-active" : ""} href={href(activeTeam.id, "settings")}><Settings size={20} /><span>Cài đặt đội</span></a><a className="profile-row" href={href(activeTeam.id, "profile")}><span className="avatar avatar-photo">{initials(data.profile.full_name)}</span><span><strong>{data.profile.full_name}</strong><small>{isOwner ? "Owner" : "Member"}</small></span><ArrowRight size={17} /></a><form action={signOut}><button><LogOut size={17} /> Đăng xuất</button></form></div>
    </aside>{mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}
    <section className="main-panel"><header className="topbar"><div className="topbar-title"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Menu size={20} /></button><div><p>{activeTeam.name.toUpperCase()}</p><h1>{viewTitles[view]}</h1></div></div><div className="topbar-actions"><a className="icon-button notification-button" href={href(activeTeam.id, "feed")} aria-label="Bảng tin"><Bell size={19} />{unread > 0 && <i />}</a>{isOwner && <a className="primary-button" href={href(activeTeam.id, "sessions")}><Plus size={18} /><span>Tạo buổi chơi</span></a>}</div></header>
      <div className="dashboard-content workspace-content"><Alert message={message} error={error} />{view === "dashboard" && <DashboardView data={data} isOwner={isOwner} />}{view === "sessions" && <SessionsView data={data} isOwner={isOwner} />}{view === "members" && <MembersView data={data} isOwner={isOwner} />}{view === "balances" && <BalancesView data={data} isOwner={isOwner} />}{view === "feed" && <FeedView data={data} isOwner={isOwner} />}{view === "settings" && <SettingsView data={data} isOwner={isOwner} />}{view === "profile" && <ProfileView data={data} />}</div>
    </section>
  </main>;
}
