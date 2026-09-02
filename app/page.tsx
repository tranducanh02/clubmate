"use client";

import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Clock3,
  CreditCard, LayoutDashboard, MapPin, Menu, MessageCircle, MoreHorizontal,
  Newspaper, Plus, Search, Settings, Sparkles, Trophy, Users, WalletCards, X, Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type NavItem = { label: string; icon: typeof LayoutDashboard };

const navItems: NavItem[] = [
  { label: "Tổng quan", icon: LayoutDashboard },
  { label: "Lịch chơi", icon: CalendarDays },
  { label: "Thành viên", icon: Users },
  { label: "Thu chi", icon: WalletCards },
  { label: "Bảng tin", icon: Newspaper },
];

const chartData = {
  "8 tuần": [
    { label: "T1", value: 58 }, { label: "T2", value: 66 },
    { label: "T3", value: 61 }, { label: "T4", value: 74 },
    { label: "T5", value: 69 }, { label: "T6", value: 81 },
    { label: "T7", value: 77 }, { label: "T8", value: 86 },
  ],
  "6 tháng": [
    { label: "T3", value: 62 }, { label: "T4", value: 68 },
    { label: "T5", value: 74 }, { label: "T6", value: 71 },
    { label: "T7", value: 79 }, { label: "T8", value: 86 },
  ],
};

const sessions = [
  { day: "05", month: "THG 9", title: "Buổi cầu lông tối thứ Sáu", meta: "19:00 – 21:00", place: "Sân Tada, Q. Bình Thạnh", attending: 12, capacity: 16, color: "lime" },
  { day: "08", month: "THG 9", title: "Pickleball cuối tuần", meta: "07:30 – 09:30", place: "D-Joy, TP. Thủ Đức", attending: 9, capacity: 12, color: "pink" },
];

const balances = [
  { name: "Minh Nguyễn", initials: "MN", amount: 125000, tone: "green" },
  { name: "Hà Trần", initials: "HT", amount: 80000, tone: "pink" },
  { name: "Tuấn Anh", initials: "TA", amount: -145000, tone: "yellow" },
  { name: "Linh Phạm", initials: "LP", amount: -220000, tone: "peach" },
];

const notifications = [
  "Hà Trần đã xác nhận tham gia buổi tối thứ Sáu.",
  "Tuấn Anh vừa bình luận trong bảng tin.",
  "Buổi chơi 29/08 đã được chốt chi phí.",
];

const formatMoney = (amount: number) => `${amount < 0 ? "−" : "+"}${Math.abs(amount).toLocaleString("vi-VN")}đ`;

export default function Home() {
  const [activeNav, setActiveNav] = useState("Tổng quan");
  const [teamOpen, setTeamOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState("Sài Gòn Smash Club");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [period, setPeriod] = useState<keyof typeof chartData>("8 tuần");
  const [rsvp, setRsvp] = useState<"going" | "not-going" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const chart = useMemo(() => chartData[period], [period]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setModalOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectNav = (label: string) => { setActiveNav(label); setMobileOpen(false); };
  const createSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreated(true);
    setTimeout(() => { setCreated(false); setModalOpen(false); }, 1100);
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true"><Zap size={22} strokeWidth={2.6} /></div>
          <span className="brand-name">ClubMate</span>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X size={20} /></button>
        </div>

        <div className="team-switcher-wrap">
          <button className="team-switcher" onClick={() => setTeamOpen((value) => !value)} aria-expanded={teamOpen}>
            <span className="team-badge">SG</span>
            <span><small>Đội của bạn</small><strong>{activeTeam}</strong></span>
            <ChevronDown size={17} />
          </button>
          {teamOpen && (
            <div className="team-menu">
              {["Sài Gòn Smash Club", "Sunday Pickle Crew"].map((team) => (
                <button key={team} onClick={() => { setActiveTeam(team); setTeamOpen(false); }}>
                  {team}{activeTeam === team && <Check size={16} />}
                </button>
              ))}
              <button className="new-team"><Plus size={16} /> Tạo đội mới</button>
            </div>
          )}
        </div>

        <nav className="main-nav" aria-label="Điều hướng chính">
          <p className="nav-kicker">QUẢN LÝ ĐỘI</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={activeNav === label ? "nav-active" : ""} onClick={() => selectNav(label)}>
              <Icon size={20} strokeWidth={1.8} /><span>{label}</span>
              {label === "Bảng tin" && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => selectNav("Cài đặt")}><Settings size={20} strokeWidth={1.8} /><span>Cài đặt đội</span></button>
          <div className="profile-row">
            <span className="avatar avatar-photo">MN</span>
            <span><strong>Minh Nguyễn</strong><small>Owner</small></span>
            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}

      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
            <div><p>THỨ TƯ, 02 THÁNG 9</p><h1>{activeNav}</h1></div>
          </div>
          <div className="topbar-actions">
            <button className="search-button" onClick={() => setSearchOpen(true)}><Search size={18} /><span>Tìm kiếm...</span><kbd>⌘ K</kbd></button>
            <div className="notification-wrap">
              <button className="icon-button notification-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Thông báo" aria-expanded={notificationsOpen}><Bell size={20} /><i /></button>
              {notificationsOpen && (
                <div className="notification-panel">
                  <div className="panel-heading"><strong>Thông báo</strong><span>3 mới</span></div>
                  {notifications.map((item, index) => <button key={item}><span className={`notification-dot dot-${index + 1}`} /><span>{item}</span></button>)}
                  <button className="view-all">Xem tất cả thông báo</button>
                </div>
              )}
            </div>
            <button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={19} /><span>Tạo buổi chơi</span></button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-card">
            <div className="welcome-copy">
              <span className="eyebrow"><Sparkles size={15} /> TUẦN NÀY</span>
              <h2>Chào buổi sáng,<br />Minh!</h2>
              <p>Đội đang có một tuần thật sung sức. Tỷ lệ tham gia tăng <strong>8%</strong> so với tuần trước.</p>
              <button onClick={() => selectNav("Thành viên")}>Xem thành tích đội <ArrowRight size={18} /></button>
            </div>
            <div className="welcome-visual" aria-hidden="true">
              <div className="sport-orbit orbit-one"><span>12</span><small>người đi</small></div>
              <div className="sport-orbit orbit-two"><Trophy size={26} /></div>
              <div className="court-lines"><span /><span /><span /></div>
              <div className="shuttle"><Zap size={54} fill="currentColor" /></div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Chỉ số tháng 9">
            <article className="stat-card"><div className="stat-icon lime-soft"><Zap size={22} /></div><div className="stat-copy"><span>Buổi chơi tháng này</span><strong>08</strong><small className="trend positive"><ArrowUpRight size={14} /> 2 buổi so với T8</small></div></article>
            <article className="stat-card"><div className="stat-icon pink-soft"><Users size={22} /></div><div className="stat-copy"><span>Thành viên hoạt động</span><strong>24</strong><small className="trend positive"><ArrowUpRight size={14} /> 3 thành viên mới</small></div></article>
            <article className="stat-card"><div className="stat-icon yellow-soft"><CircleDollarSign size={22} /></div><div className="stat-copy"><span>Tổng đã thu</span><strong>3,84tr</strong><small className="trend neutral">80% quỹ tháng</small></div></article>
            <article className="stat-card debt-card"><div className="stat-icon peach-soft"><CreditCard size={22} /></div><div className="stat-copy"><span>Tổng đang nợ</span><strong>−365k</strong><small className="trend negative"><ArrowDownRight size={14} /> 2 thành viên</small></div></article>
          </section>

          <div className="dashboard-grid">
            <section className="content-card attendance-card">
              <div className="section-heading">
                <div><span className="section-icon"><Activity size={18} /></span><div><h3>Tỷ lệ tham gia</h3><p>Dựa trên điểm danh thực tế</p></div></div>
                <div className="segmented" aria-label="Khoảng thời gian">{(Object.keys(chartData) as (keyof typeof chartData)[]).map((item) => <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>
              </div>
              <div className="chart-summary"><strong>78,4%</strong><span><ArrowUpRight size={14} /> 6,2%</span><small>trung bình</small></div>
              <div className="bar-chart" role="img" aria-label={`Biểu đồ tỷ lệ tham gia trong ${period}`}>
                <div className="chart-guides"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
                <div className="bars">{chart.map((item, index) => <div className="bar-item" key={`${period}-${item.label}-${index}`}><div className="bar-track"><span style={{ height: `${item.value}%` }}><i>{item.value}%</i></span></div><small>{item.label}</small></div>)}</div>
              </div>
            </section>

            <section className="content-card balance-card">
              <div className="section-heading balance-heading"><div><span className="section-icon"><WalletCards size={18} /></span><div><h3>Số dư thành viên</h3><p>Tháng 9/2026</p></div></div><button className="round-link" onClick={() => selectNav("Thu chi")} aria-label="Xem thu chi"><ArrowRight size={18} /></button></div>
              <div className="balance-list">{balances.map((person) => <button key={person.name}><span className={`avatar avatar-${person.tone}`}>{person.initials}</span><span className="person-name"><strong>{person.name}</strong><small>{person.amount >= 0 ? "Đã cân đối" : "Cần thanh toán"}</small></span><strong className={person.amount >= 0 ? "money-positive" : "money-negative"}>{formatMoney(person.amount)}</strong></button>)}</div>
              <button className="text-link" onClick={() => selectNav("Thu chi")}>Xem bảng số dư <ArrowRight size={16} /></button>
            </section>
          </div>

          <section className="sessions-section">
            <div className="sessions-header"><div><h3>Buổi chơi sắp tới</h3><p>Lên sân cùng mọi người nhé!</p></div><div className="header-controls"><button aria-label="Lịch trước"><ChevronLeft size={18} /></button><button aria-label="Lịch sau"><ChevronRight size={18} /></button><button className="outline-pill" onClick={() => selectNav("Lịch chơi")}>Xem lịch đầy đủ</button></div></div>
            <div className="session-grid">
              {sessions.map((session, index) => (
                <article className="session-card" key={session.title}>
                  <div className={`date-tile date-${session.color}`}><strong>{session.day}</strong><small>{session.month}</small></div>
                  <div className="session-info"><span className="session-type">{index === 0 ? "CẦU LÔNG" : "PICKLEBALL"}</span><h4>{session.title}</h4><p><Clock3 size={16} /> {session.meta}</p><p><MapPin size={16} /> {session.place}</p></div>
                  <div className="session-attendance"><div className="mini-avatars"><i>MN</i><i>HT</i><i>TA</i><i>+{session.attending - 3}</i></div><span>{session.attending}/{session.capacity} người đã tham gia</span>{index === 0 ? <div className="rsvp-buttons"><button className={rsvp === "going" ? "rsvp-active" : ""} onClick={() => setRsvp("going")}><Check size={16} /> Đi</button><button className={rsvp === "not-going" ? "rsvp-no" : ""} onClick={() => setRsvp("not-going")}><X size={16} /> Không đi</button></div> : <button className="detail-button">Xem chi tiết <ArrowRight size={16} /></button>}</div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}><form className="modal" onSubmit={createSession} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="modal-icon"><CalendarDays size={20} /></span><div><h3>Tạo buổi chơi</h3><p>Thêm một lịch hẹn mới cho đội.</p></div></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Đóng"><X size={20} /></button></div><label>Tên buổi chơi<input required defaultValue="Cầu lông tối thứ Sáu" /></label><div className="form-row"><label>Ngày<input type="date" required defaultValue="2026-09-05" /></label><label>Giờ bắt đầu<input type="time" required defaultValue="19:00" /></label></div><label>Địa điểm<input required defaultValue="Sân Tada, Q. Bình Thạnh" /></label><label>Số người tối đa<input type="number" min="2" defaultValue="16" /></label><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setModalOpen(false)}>Huỷ</button><button type="submit" className="primary-button">{created ? <><Check size={18} /> Đã tạo!</> : <><Plus size={18} /> Tạo buổi chơi</>}</button></div></form></div>}

      {searchOpen && <div className="search-overlay" role="presentation" onMouseDown={() => setSearchOpen(false)}><div className="search-dialog" onMouseDown={(event) => event.stopPropagation()}><Search size={22} /><input autoFocus placeholder="Tìm thành viên, buổi chơi, thông báo..." aria-label="Tìm kiếm" /><button onClick={() => setSearchOpen(false)}>ESC</button><div className="search-hints"><span><CalendarDays size={17} /> Buổi cầu lông tối thứ Sáu</span><span><Users size={17} /> Tuấn Anh</span><span><MessageCircle size={17} /> Thông báo đóng quỹ tháng 9</span></div></div></div>}
    </main>
  );
}
