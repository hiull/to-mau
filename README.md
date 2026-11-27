# 🎨 Tô Màu

App tô màu chạy trên iPhone, Android và máy tính — mở bằng trình duyệt, cài lên màn hình chính như app thật, dùng được cả khi không có mạng.

- **Tô vùng**: chạm một cái là cả vùng đổi màu; tự vá khe hở nhỏ trên nét nên màu không tràn.
- **Cọ tự do** (có chế độ *Giữ trong vùng*), **tẩy** (chạm xoá vùng hoặc tẩy bằng cọ), **hoàn tác/làm lại** 30 bước.
- **Bảng màu**: 24 màu nhanh, 8 màu gần đây, bảng chọn chi tiết (sắc độ/độ đậm/độ sáng, mã hex) và 4 bộ màu theo chủ đề.
- **Thư viện** 18 hình chia 3 cấp Dễ / Vừa / Khó, và mục **Của tôi** cho hình bạn thêm.
- **Thêm hình** từ ảnh trong máy hoặc chụp bằng camera: tự biến thành tranh tô màu, chỉnh *Độ chi tiết*, cắt, xoay, và *Làm mượt nét* (chuyển sang vector).
- **Tự lưu** tranh đang tô; **Lưu ảnh** ra file PNG (trên điện thoại mở bảng chia sẻ để lưu vào Ảnh).

Mọi xử lý chạy ngay trên máy của bạn — ảnh không được gửi đi đâu.

## Cách dùng

- **Mở app**: vào địa chỉ GitHub Pages của repo (dạng `https://<tên-tài-khoản>.github.io/to-mau/`).
- **Cài lên màn hình chính**
  - iPhone/iPad (Safari): nút Chia sẻ → *Thêm vào Màn hình chính*. Nên cài để Safari không tự xoá tranh đã lưu.
  - Android (Chrome): menu ⋮ → *Cài đặt ứng dụng* / *Thêm vào màn hình chính*.
  - Máy tính (Chrome/Edge): biểu tượng cài đặt ở thanh địa chỉ.
- **Thao tác**: một ngón để tô/vẽ; hai ngón để phóng to và kéo. Trên máy tính: lăn chuột để phóng to, giữ phím Space (hoặc nút chuột giữa) và kéo để di chuyển; Ctrl+Z / Ctrl+Shift+Z để hoàn tác / làm lại.

Tranh và hình bạn thêm được lưu trong trình duyệt của từng máy, không đồng bộ giữa các máy.

## Đưa app lên mạng (GitHub Pages)

1. Trong repo trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge code vào nhánh `main`. Workflow `.github/workflows/deploy.yml` sẽ chạy test, build và đăng app.

## Thêm hình có sẵn mới

Các hình trong thư viện được tạo bằng `scripts/gen-drawings.mjs`:

1. Thêm một lệnh `add('ma-hinh', 'Tên hình', 'de' | 'vua' | 'kho', độ-dày-nét, [...các hình khối])` trong file đó.
   Hoặc tự vẽ một file SVG 1000×1000 (nền trắng, nét đen, các vùng khép kín) vào `public/drawings/` và khai báo trong `public/drawings/catalog.json`.
2. Chạy `node scripts/gen-drawings.mjs` (nếu dùng script).
3. Chạy `npm test` — bài kiểm tra sẽ đếm số vùng để chắc hình đúng cấp (Dễ 5–15, Vừa 20–60, Khó từ 100).

## Phát triển

```bash
npm install
npm run dev        # chạy thử tại http://localhost:5173/to-mau/
npm test           # kiểm thử đơn vị (Vitest)
npm run e2e        # kiểm thử trình duyệt (Playwright, cần Chromium)
npm run build      # build vào thư mục dist/
```

Cấu trúc chính:

| Thư mục | Nội dung |
|---|---|
| `src/core/` | Bản đồ vùng, tô vùng, cọ, hoàn tác — thuần TypeScript, không phụ thuộc DOM |
| `src/import/` | Biến ảnh thành tranh nét, vector hoá |
| `src/worker/` | Chạy xử lý nặng trong Web Worker |
| `src/storage/` | Lưu trữ IndexedDB |
| `src/ui/` | Các màn hình: thư viện, tô màu, thêm hình |
| `docs/superpowers/` | Bản thiết kế và kế hoạch xây dựng |
