# App tô màu "Tô Màu" — Bản thiết kế

Ngày: 2026-11-27 · Trạng thái: chờ duyệt

## 1. Mục đích

Một app tô màu **dùng riêng** (cho chủ repo và người quen), chạy được trên
iPhone, Android và máy tính. Trong app có sẵn thư viện hình từ đơn giản đến phức tạp,
và người dùng có thể **import hình mới** từ hình vẽ (tranh nét) hoặc ảnh chụp.

App phục vụ cả hai kiểu người dùng trong cùng một giao diện:
- **Tô nhanh**: chạm một cái là cả vùng đổi màu (hợp với trẻ em, tô thư giãn).
- **Tô kỹ**: bảng màu chi tiết, phóng to để tô vùng nhỏ, cọ tô tự do.

## 2. Mục tiêu / Không làm / Thất bại nếu…

**Mục tiêu**
- Tô vùng bằng một chạm, phản hồi tức thì (< 50 ms cảm nhận) kể cả hình phức tạp trên điện thoại tầm trung.
- Bảng màu chi tiết + cọ tô tự do + tẩy.
- Thư viện hình có sẵn, chia 3 cấp Dễ / Vừa / Khó.
- Import hình từ thư viện ảnh / camera / file, tự chuyển thành tranh tô màu.
- Dùng được offline, cài lên màn hình chính như app thật.
- Tự lưu tranh đang tô; xuất tranh đã tô ra ảnh PNG.

**Không làm (lúc này)**
- Không phát hành lên App Store / Google Play.
- Không tài khoản, không máy chủ, không đồng bộ giữa các máy.
- Không dùng AI / dịch vụ trả phí để chuyển ảnh thành tranh nét.
- Không có tính năng mạng xã hội, chia sẻ cộng đồng, quảng cáo.

**Thất bại nếu** (dù về mặt kỹ thuật vẫn "chạy")
- Màu tràn ra ngoài vùng qua khe hở nhỏ trên nét vẽ.
- Chạm tô bị trễ rõ rệt trên điện thoại.
- Mất tranh đang tô khi đóng app.
- Trẻ nhỏ dễ bấm nhầm làm hỏng tranh mà không hoàn tác được.

## 3. Ràng buộc

- Một codebase duy nhất cho mọi thiết bị → **web app cài được (PWA)**.
- Host miễn phí trên **GitHub Pages** từ repo `hiull/to-mau`.
- Mọi xử lý (tách nét, tính vùng, vector hoá) chạy **trên máy người dùng**, ảnh không rời khỏi máy.
- Phải chạy trên Safari iOS (giới hạn bộ nhớ canvas ~16 triệu pixel/canvas; lưu trữ có thể bị dọn nếu không "thêm vào màn hình chính").

## 4. Các cách đã cân nhắc

| Cách | Mô tả | Được | Mất |
|---|---|---|---|
| 1. Ảnh điểm + đổ màu loang | Mỗi lần chạm chạy flood fill trên pixel | Đơn giản, hình import và có sẵn như nhau | Mờ khi phóng to, tràn qua khe hở, chậm với hình lớn |
| 2. Vector (SVG) | Mỗi vùng là một path khép kín | Sắc nét, tô tức thì | Ảnh import vector hoá ra hàng nghìn mảnh vụn |
| 3. Lai: bản đồ vùng tính sẵn | Khi mở hình, gán nhãn mọi vùng một lần; chạm = tra nhãn | Tức thì, vá được khe hở, chung một đường cho mọi hình | Phóng to rất sâu không nét bằng vector |
| (loại) Flutter / React Native | App native | — | Chỉ đáng khi lên cửa hàng; người dùng chọn dùng riêng |

**Chọn: ghép cả ba**, mỗi cách dùng đúng chỗ mạnh nhất (người dùng đồng ý):
- Hình có sẵn lưu dạng **SVG** (cách 2) → nét luôn sắc.
- Mọi thao tác tô vùng chạy bằng **bản đồ vùng** (cách 3), bản đồ được tạo từ ảnh điểm (cách 1).
- Hình import mặc định là ảnh điểm; có nút **"Làm mượt nét"** để vector hoá sang SVG (cách 2).

## 5. Thiết kế

### 5.1 Công nghệ *(quyết định của người làm, chủ repo không chọn)*
- **Vite + TypeScript**, không dùng framework UI nặng (giao diện ít màn hình; giữ app nhẹ, nhanh trên điện thoại).
- **Canvas 2D** cho lớp màu; nét vẽ hiển thị bằng SVG/ảnh đè lên trên.
- **Web Worker** cho xử lý nặng (tách nét, gán nhãn vùng, vector hoá) để không đơ giao diện.
- **IndexedDB** để lưu hình import và tranh đang tô.
- **vite-plugin-pwa** cho offline + cài lên màn hình chính.
- Vector hoá: thư viện **potrace** bản JS/WASM chạy trong worker.
- Deploy: GitHub Actions → GitHub Pages.
- Giao diện tiếng Việt.

### 5.2 Mô hình lớp của một bức tranh
```
[ Lớp nét (line art) ]   ← SVG (hình có sẵn / đã làm mượt) hoặc PNG nét (import)
[ Lớp màu  (canvas)  ]   ← tô vùng + cọ đều vẽ vào đây
[ Nền trắng          ]
```
Nét luôn nằm trên cùng nên tô thế nào nét cũng không bị che.

### 5.3 Bản đồ vùng (trái tim của app)
Khi mở một hình:
1. Raster hoá lớp nét ở độ phân giải làm việc (cạnh dài ~2048 px, giảm trên máy yếu / iOS).
2. Nhị phân hoá: pixel tối → "nét".
3. **Vá khe hở**: làm dày nét tạm thời 1–2 px (morphological dilation) chỉ để tính vùng, không ảnh hưởng hiển thị.
4. Gán nhãn thành phần liên thông → mảng `Uint32` nhãn vùng cho mỗi pixel.
5. Pixel nét (và phần nét được làm dày) được gán vào vùng lân cận gần nhất khi tô, để không còn viền trắng lởm chởm giữa màu và nét.
6. Lưu kết quả vào cache (IndexedDB) để mở lại tức thì.

Chạm tô: tra nhãn tại điểm chạm → tô toàn bộ pixel cùng nhãn bằng mask tính sẵn. Vùng quá nhỏ (vụn) được gộp vào vùng lớn bên cạnh.

### 5.4 Công cụ tô
- **Tô vùng** (mặc định): chạm = đổ màu cả vùng. Chạm lại vùng đã tô bằng màu khác = đổi màu.
- **Cọ tự do**: chọn cỡ cọ (vài mức + thanh trượt), độ mờ. Tuỳ chọn **"Giữ trong vùng"**: nét cọ không lem ra ngoài vùng bắt đầu vẽ (dùng mask vùng). *Mặc định: tắt* (quyết định của người làm).
- **Tẩy**: dạng cọ và dạng chạm-xoá-cả-vùng.
- **Hoàn tác / Làm lại**: tối thiểu 30 bước, nút to, luôn hiển thị.
- **Phóng to / kéo**: hai ngón tay trên điện thoại; lăn chuột + kéo trên máy tính. Một ngón = tô, hai ngón = di chuyển (tránh tô nhầm khi kéo).

### 5.5 Bảng màu
- Hàng màu nhanh: ~24 màu tươi, ô to dễ bấm.
- Mở rộng: bảng chọn chi tiết (vòng màu / HSL + nhập mã hex).
- Màu dùng gần đây (8 ô).
- Bảng màu có sẵn theo chủ đề (pastel, rừng, biển…) *(quyết định của người làm)*.

### 5.6 Thư viện hình có sẵn
- 15–20 hình SVG do người làm tự vẽ (bản quyền sạch), chia 3 cấp:
  - **Dễ** (5–15 vùng, nét dày): quả táo, con cá, ngôi nhà, mặt trời…
  - **Vừa** (20–60 vùng): con mèo, ô tô, bông hoa, khu vườn…
  - **Khó** (100+ vùng, nét mảnh): mandala, phong cảnh, hoa văn.
- Chủ đề cụ thể là quyết định của người làm; dễ bổ sung sau (thả file SVG vào thư mục + khai báo trong một file danh mục).

### 5.7 Import hình mới
Nguồn: chọn ảnh từ máy / chụp bằng camera / kéo-thả file (PNG, JPG, WebP; HEIC nếu trình duyệt hỗ trợ).

Hai chế độ, app tự đoán và người dùng có thể đổi:
- **Hình vẽ nét** (tranh tô màu tải về, ảnh chụp tranh vẽ tay): chuyển xám → cân bằng sáng (xử lý bóng giấy khi chụp) → ngưỡng thích nghi → lọc chấm vụn.
- **Ảnh chụp thật**: làm mịn → dò cạnh → làm dày/nối nét → lọc vụn. Kết quả kém hoàn hảo hơn, đây là giới hạn đã chấp nhận.

Màn hình xem trước có:
- Thanh trượt **"Độ chi tiết"** (ngưỡng + mức lọc vụn), cập nhật xem trước trực tiếp.
- Cắt / xoay ảnh.
- Nút **"Làm mượt nét"** → vector hoá thành SVG.
- Đặt tên, chọn cấp độ (mặc định tự đoán theo số vùng).

Hình import được lưu vào mục **"Hình của tôi"** trong thư viện; xoá được.

### 5.8 Lưu và xuất
- **Tự lưu** tranh đang tô sau mỗi thao tác (debounce ~1 giây) vào IndexedDB.
- Thư viện hiển thị ảnh thu nhỏ có màu của tranh đang tô dở; có thể "Tô lại từ đầu".
- **Xuất PNG** (màu + nét) qua chia sẻ của hệ điều hành (Web Share) hoặc tải xuống.
- Yêu cầu trình duyệt lưu trữ bền vững (`navigator.storage.persist()`); nhắc người dùng iPhone "thêm vào màn hình chính" để tránh bị dọn dữ liệu.

### 5.9 Màn hình
```
Thư viện                     Màn hình tô
┌────────────────────┐       ┌──────────────────────────┐
│ [Dễ][Vừa][Khó][Của tôi]│   │ ←  Tên hình   ↶ ↷  ⤓     │
│ ┌──┐ ┌──┐ ┌──┐     │       │                          │
│ │🍎│ │🐟│ │🏠│     │       │       (bức tranh)        │
│ └──┘ └──┘ └──┘     │       │                          │
│ ...                │       │ [Tô vùng][Cọ][Tẩy] cỡ ●  │
│        [＋ Import] │       │ ● ● ● ● ● ● ● ● ●  [🎨] │
└────────────────────┘       └──────────────────────────┘
```
Màn hình rộng (máy tính / tablet ngang): bảng màu và công cụ chuyển sang cột bên.

## 6. Kiểm thử *(quyết định của người làm)*
- Kiểm thử đơn vị cho xử lý ảnh: gán nhãn vùng, vá khe hở, lọc vụn, chuyển đổi import (ảnh mẫu cố định).
- Kiểm thử trình duyệt (Playwright): mở hình, chạm tô, hoàn tác, tự lưu và mở lại, import một ảnh mẫu.
- Kiểm tra tay trên Safari iOS và Chrome Android trước khi coi là xong.

## 7. Để lại cho người làm quyết định
- Cấu trúc thư mục, tên module, chi tiết thuật toán (ngưỡng, kích thước kernel, thuật toán gán nhãn).
- Độ phân giải làm việc cụ thể theo từng loại máy.
- Biểu tượng app, màu sắc giao diện, font.
- Nội dung cụ thể của 15–20 hình mẫu.

## 8. Các quyết định người làm đã tự đưa ra (để chủ repo soát)
1. Giao diện tiếng Việt.
2. Không có AI / máy chủ; import xử lý hoàn toàn trên máy.
3. Hoàn tác ≥ 30 bước; một ngón tô, hai ngón di chuyển.
4. "Giữ trong vùng" cho cọ: có, mặc định tắt.
5. Bảng màu theo chủ đề + màu gần đây.
6. Xuất PNG; không xuất PDF/in.
7. Hình mẫu do người làm tự vẽ, chủ đề tự chọn.
