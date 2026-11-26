# Cài đặt nhận thông báo đăng ký tư vấn qua Gmail

Khi khách gửi form ở trang `dat-truoc.html`:
1. thông tin được lưu vào một Google Sheet,
2. **email báo ngay** được gửi tới Gmail người bán. Email gồm họ tên, số điện thoại, email, số bộ, lời nhắn và có nút gọi điện / nhắn Zalo.

Không cần server, không mất phí. Làm một lần, khoảng 10 phút.

## Các bước

1. Đăng nhập **tài khoản Google sẽ dùng để gửi mail** (thư báo sẽ được gửi từ tài khoản này).
2. Tạo Google Sheet mới, đặt tên ví dụ "Cổ Loa – Đăng ký tư vấn".
3. Trong Sheet: **Tiện ích mở rộng → Apps Script**. Xóa code mẫu, dán toàn bộ nội dung file `Code.gs` vào.
4. Sửa dòng `SELLER_EMAIL` thành Gmail người bán (nhiều người nhận thì ngăn cách bằng dấu phẩy). Bấm **Lưu**.
5. Chọn hàm `testSendMail` → **Chạy** → cấp quyền khi Google hỏi (chọn "Nâng cao → Đi tới… (không an toàn)" vì đây là script của chính anh). Kiểm tra hộp thư người bán đã nhận email thử.
6. **Triển khai → Tùy chọn triển khai mới**:
   - Loại: **Ứng dụng web**
   - Thực thi với tư cách: **Tôi**
   - Ai có quyền truy cập: **Bất kỳ ai**
   - Bấm Triển khai, sao chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/…/exec`).
7. Trong thư mục `site/`, tạo file `.env` (đã có trong `.gitignore`):
   ```
   VITE_PREORDER_URL=https://script.google.com/macros/s/…/exec
   ```
8. Build và deploy lại site (`npm run build` rồi deploy như thường lệ). URL này được gắn vào lúc build.

## Lưu ý

- **Giới hạn gửi mail:** tài khoản Gmail thường gửi được khoảng **100 email/ngày** qua Apps Script (Google Workspace: 1.500/ngày). Dư cho trang đăng ký tư vấn.
- **Sửa code script sau này:** phải vào **Triển khai → Quản lý triển khai → sửa → Phiên bản mới**, nếu không web vẫn chạy bản cũ. URL giữ nguyên.
- **Trả lời khách:** nếu khách có để email, bấm "Trả lời" trong Gmail là gửi thẳng cho khách.
- Bấm "Gửi lại" nhiều lần không tạo dòng trùng và không gửi mail trùng (dùng mã yêu cầu).
- Form có một ô ẩn chống bot spam; người dùng thật không nhìn thấy.
- Muốn nhận thông báo trên điện thoại: bật thông báo của ứng dụng Gmail cho tài khoản người bán.
