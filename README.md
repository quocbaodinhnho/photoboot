# 📸 Photobooth

Photobooth chạy hoàn toàn trên trình duyệt (HTML + CSS + JavaScript), không cần server.
Chụp 4 tấm liên tiếp, ghép thành dải ảnh và tải về PNG.

## Tính năng
- Chụp 4 ảnh tự động có đếm ngược (2/3/5 giây)
- Bộ lọc: đen trắng, sepia, rực rỡ, dịu nhẹ, tương phản
- 5 màu khung, dòng chữ tuỳ chọn + ngày chụp
- Tải dải ảnh về dạng PNG
- Ảnh chỉ xử lý trên máy bạn, không upload đi đâu

## Chạy trên GitHub Pages
1. Tạo repo mới trên GitHub (ví dụ `photobooth`).
2. Upload 4 file: `index.html`, `style.css`, `script.js`, `README.md` (hoặc dùng git push).
3. Vào **Settings → Pages**.
4. Ở **Build and deployment**, chọn **Source: Deploy from a branch**, branch **main**, thư mục **/(root)** → **Save**.
5. Đợi 1–2 phút, truy cập: `https://<ten-github>.github.io/photobooth/`
6. Cho phép quyền camera khi trình duyệt hỏi.

> Camera chỉ hoạt động trên **HTTPS** hoặc `localhost`. GitHub Pages mặc định là HTTPS nên chạy tốt.

## Chạy thử trên máy
```bash
python3 -m http.server 8000
# mở http://localhost:8000
```
