# Kết nối ClubMate với Supabase và Vercel

## Trạng thái hiện tại

- Production: https://clubmate-gold.vercel.app
- Vercel project: `ducanhs-projects-6f11c09a/clubmate`
- Supabase project: `clubmate` (`owoizxbpyymyxaaafqnn`)
- Database migration, RLS, biến môi trường và Auth redirect URL đã được áp dụng.

Các bước dưới đây là quy trình để kết nối lại hoặc triển khai sang một tài khoản khác.

## 1. Tạo và liên kết Supabase

1. Tạo project tại https://supabase.com/dashboard.
2. Chạy `npx supabase login`.
3. Chạy `npx supabase link --project-ref <PROJECT_REF>`.
4. Kiểm tra migration bằng `npx supabase db push --dry-run`.
5. Áp schema bằng `npx supabase db push`.
6. Trong Supabase **Connect**, sao chép Project URL và Publishable key vào `.env.local` theo `.env.example`.

Không đưa `service_role` hoặc secret key vào biến có tiền tố `NEXT_PUBLIC_`.

## 2. Chạy cục bộ

```bash
npm run dev
```

Khi URL/key hợp lệ, trang `/` yêu cầu đăng nhập. Nếu chưa có URL/key, dashboard mẫu vẫn mở để phát triển giao diện.

## 3. Deploy Vercel

1. Chạy `npx vercel login`, sau đó `npx vercel link`.
2. Thêm ba biến vào Production và Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3. Chạy `npx vercel --prod`.
4. Đặt `NEXT_PUBLIC_SITE_URL` thành URL production rồi redeploy.
5. Trong Supabase Authentication → URL Configuration, đặt Site URL là URL production và thêm:
   - `http://localhost:3000/**`
   - URL production
   - wildcard Preview URL của Vercel

## 4. Kiểm tra bắt buộc

- Đăng ký tạo đúng một dòng `profiles`.
- Giới tính không thể thay đổi sau đăng ký.
- User chưa đăng nhập bị chuyển tới `/login`.
- Member đội A không đọc được dữ liệu đội B.
- Member chỉ RSVP cho chính mình; Owner quản lý toàn đội.
