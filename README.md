# ClubMate

Ứng dụng SaaS quản lý nhóm cầu lông và pickleball, xây bằng Next.js 16, Supabase và Lucide React.

Production: https://clubmate-gold.vercel.app

## Tính năng

- Email/password auth, xác nhận email, quên/đổi mật khẩu và hồ sơ cá nhân.
- Nhiều team trên một tài khoản; tạo team, join mã mời, duyệt thành viên.
- Real member, ghost member và mã nhận để gắn lại toàn bộ lịch sử.
- Lịch chơi, RSVP Đi/Không đi, guest player và điểm danh thực tế.
- Chốt tiền sân/cầu theo hệ số `1`, `1,5`, `2`, làm tròn lên 1.000đ.
- Bảng số dư độc lập theo tháng và tổng tiền đã đóng do Owner cập nhật.
- Bảng tin, bình luận và YouTube embed.
- Dashboard riêng cho Owner/Member từ dữ liệu thật.
- Multi-tenant Row Level Security và Storage policies trên Supabase.

## Chạy local

Sao chép `.env.example` thành `.env.local`, điền Supabase URL và publishable key, sau đó:

```bash
npm install
npm run dev
```

Kiểm tra trước khi deploy:

```bash
npm run lint
npm test
npm run build
```

Migration nằm trong `supabase/migrations`. Quy trình Supabase/Vercel chi tiết xem tại `SUPABASE-VERCEL.md`.
