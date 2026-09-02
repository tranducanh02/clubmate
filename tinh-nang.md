# ClubMate — Mô tả tính năng chi tiết

Web quản lý thành viên nhóm thể thao (cầu lông, pickleball), định hướng phát triển thành SaaS cho nhiều nhóm.

---

## 1. Auth & Profile

### 1.1 Đăng ký

- Trường: email, họ tên, giới tính (Nam / Nữ), mật khẩu (≥ 6 ký tự)
- Giới tính **cố định ngay từ khi đăng ký, áp dụng cho mọi team**, không thể chỉnh sửa sau — vì được dùng làm căn cứ tính tiền theo hệ số nam/nữ
- Sau khi đăng ký thành công, hệ thống tự tạo hồ sơ (`profile`) gắn với tài khoản

### 1.2 Đăng nhập

- Email + mật khẩu
- Có chức năng "Quên mật khẩu" — gửi email đặt lại mật khẩu

### 1.3 Hồ sơ cá nhân (Profile)

- Đổi avatar
- Thêm/sửa số điện thoại
- Đổi mật khẩu

---

## 2. Quản lý Team

### 2.1 Tạo team

- Tên team (bắt buộc), mô tả (tuỳ chọn), ảnh bìa (nếu không chọn, dùng ảnh mặc định)
- Người tạo tự động trở thành **Owner** của team

### 2.2 Vai trò

- **Owner**: toàn quyền quản trị team (tạo/sửa/xoá thành viên, tạo buổi chơi, tính tiền, đăng thông báo...)
- **Member**: thành viên thông thường (RSVP, xem lịch, xem số dư của mình)

### 2.3 Tham gia team

- **Join qua mã mời**: mã 6 ký tự hoặc link mời, tương tự Google Classroom
- Owner bật/tắt chế độ **tự động duyệt**: nếu tắt, người join mới ở trạng thái "chờ duyệt" (`pending`) đến khi Owner chấp thuận

### 2.4 Quản lý thành viên (bởi Owner)

- Owner có thể **tự tạo thành viên** trực tiếp trong team chỉ với tên + giới tính, **không cần người đó có tài khoản** (gọi là _ghost member_) — dùng cho các thành viên chơi cùng nhưng chưa dùng app
- Owner có thể sửa/xoá thông tin thành viên (tên, giới tính) đối với ghost member
- Owner có thể xoá thành viên khỏi team; member có thể tự rời team

### 2.5 Cơ chế "gán tài khoản" cho ghost member

Vì một team có thể có 2 loại thành viên — người đã có tài khoản thật (_real member_) và người do Owner tạo tay (_ghost member_, không đăng nhập được) — hệ thống cần cơ chế để ghost member sau này tự "nhận lại" lịch sử của mình:

1. Owner chọn 1 ghost member → bấm **"Tạo mã nhận"** → hệ thống sinh mã riêng (khác mã mời team)
2. Owner gửi mã này cho người thật (qua Zalo/chat ngoài app)
3. Người đó tự đăng ký/đăng nhập tài khoản trên app → vào màn "Nhập mã nhận" → nhập mã
4. Hệ thống gán `user_id` của tài khoản vào đúng dòng ghost member đó
5. Toàn bộ lịch sử cũ (RSVP, điểm danh, số dư) của ghost member tự động thuộc về tài khoản thật, người dùng có thể tự đăng nhập xem từ giờ trở đi

> Lưu ý: cơ chế này tách biệt với "join qua mã mời" — join mã mời dùng cho người hoàn toàn mới; mã nhận dùng để nhận lại một hồ sơ ghost đã tồn tại, tránh tạo trùng thành viên.

---

## 3. Lịch chơi

### 3.1 Tạo buổi chơi (Owner)

- Ngày giờ, sân/địa điểm, số slot tối đa (tuỳ chọn)

### 3.2 Thêm người chơi vãng lai (Owner)

- Owner có thể thêm người chơi vào **1 buổi cụ thể** mà không cần họ là thành viên chính thức của team — chỉ cần nhập tên, giới tính (gọi là _guest player_)
- Guest player **không được tính vào bảng số dư cá nhân** của team (khác với ghost member — vốn là thành viên chính thức, có số dư)

### 3.3 RSVP

- Member xác nhận tham gia: **Đi / Không đi** (không có tuỳ chọn "chưa chắc")

### 3.4 Điểm danh

- Owner đánh dấu người có mặt thực tế sau buổi chơi (có thể khác với RSVP)
- Áp dụng cho cả thành viên chính thức và guest player
- Đây là nguồn dữ liệu duy nhất để tính tiền (xem mục 4)

---

## 4. Tính tiền buổi chơi

### 4.1 Input

| Trường                | Ghi chú                                                        |
| --------------------- | -------------------------------------------------------------- |
| Tiền sân              | nhập tay                                                       |
| Tiền cầu              | nhập tay                                                       |
| Số nam có mặt         | **tự động lấy từ điểm danh, không cho sửa tay**                |
| Số nữ có mặt          | **tự động lấy từ điểm danh, không cho sửa tay**                |
| Hệ số tiền cầu nam/nữ | segment control 3 lựa chọn: `1` \| `1,5` \| `2` — mặc định `2` |

### 4.2 Công thức tính

- **Tiền sân**: chia đều cho tổng số người có mặt (nam + nữ)
- **Tiền cầu**: chia theo hệ số đã chọn
    - Hệ số `1` → tỉ lệ nam : nữ = 1 : 1
    - Hệ số `1,5` → tỉ lệ nam : nữ = 3 : 2
    - Hệ số `2` → tỉ lệ nam : nữ = 2 : 1
- **Số tiền mỗi người** = (tiền sân đã chia) + (tiền cầu đã chia theo giới tính của họ)
- **Làm tròn lên** đến nghìn đồng gần nhất (ví dụ: 71,08 nghìn → 72 nghìn; 70,4 nghìn → 71 nghìn)

### 4.3 Lưu lịch sử

- Chỉ **Owner** có nút **"Lưu vào lịch sử"**
- Sau khi lưu, số tiền tự động cộng vào **trang số dư cá nhân** của từng thành viên theo đúng ngày chơi
- Guest player không có trong bảng lịch sử/số dư dù có tham gia tính tiền chung của buổi

### 4.4 Hiển thị theo vai trò

- **Chỉ Owner** thấy được cột **hệ số** trong bảng lịch sử các buổi đã lưu
- Member xem lịch sử nhưng không thấy cột hệ số

### 4.5 Đính kèm

- Cho phép đính kèm **1 ảnh mô tả** cho buổi chơi (ví dụ ảnh sân, ảnh nhóm)

---

## 5. Số dư cá nhân

- Xem theo **tháng**, dạng bảng (table)
- Cột: **Tên thành viên** | **Đã đóng** (Owner nhập tay 1 số/tháng) | _các cột theo từng ngày có buổi chơi trong tháng_ | **Số dư**
- Số dư = Đã đóng − Tổng tiền phải trả các buổi trong tháng; **có thể âm** (biểu thị đang nợ)
- Chỉ tính **thành viên chính thức** của team (real member + ghost member); guest player không xuất hiện ở bảng này
- **Mỗi tháng là một bảng độc lập** — số dư **không cộng dồn (carry-over)** sang tháng kế tiếp
- Không lưu lịch sử các lần đóng tiền riêng lẻ — chỉ lưu 1 số tổng "đã đóng" mỗi tháng do Owner cập nhật

---

## 6. Thông báo / Bảng tin

- Owner đăng thông báo trong team
- Thành viên bình luận/phản hồi dưới thông báo
- Đăng video thi đấu dạng **YouTube embed**

---

## 7. Dashboard

### 7.1 Dành cho Owner

- Thống kê tỷ lệ tham gia của từng thành viên (ai đi đều, ai hay vắng)
- Bảng xếp hạng "đi đều nhất" / "hay vắng nhất"
- Biểu đồ tỷ lệ điểm danh theo thời gian (tuần/tháng)
- Tổng quan quỹ: tổng đã thu vs tổng đang nợ toàn team

### 7.2 Dành cho Member

- Số tiền còn nợ (tháng hiện tại)
- Số buổi đã tham gia
- Tổng số tiền đã đóng
- Biểu đồ số dư theo từng tháng (cột âm/dương)

---

## 8. Kiến trúc kỹ thuật

- **Frontend**: React (Vite), deploy Vercel
- **Backend/DB**: Supabase (Postgres + Auth + Row Level Security)
- **Multi-tenant**: mỗi team là 1 tenant dữ liệu độc lập, RLS đảm bảo user chỉ truy cập được dữ liệu của team mình tham gia — nền tảng cho định hướng phát triển SaaS đa nhóm sau này
