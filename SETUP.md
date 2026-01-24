# 🚀 Hướng Dẫn Cài Đặt WaterFlow Pro

Hướng dẫn chi tiết để setup và chạy WaterFlow Pro trên máy local của bạn.

---

## 📋 Yêu Cầu Hệ Thống

- **Node.js**: >= 18.0.0 (khuyến nghị 20.x LTS)
- **npm**: >= 9.0.0 hoặc **yarn** >= 1.22.0
- **Git**: Để clone repository
- **Trình duyệt**: Chrome, Firefox, Safari, hoặc Edge (phiên bản mới nhất)

### ⚠️ Chưa cài Node.js?
👉 **[Xem hướng dẫn cài đặt Node.js](./INSTALL_NODEJS.md)**

### Kiểm tra phiên bản hiện tại:
```bash
node --version   # Phải >= 18.0.0
npm --version    # Phải >= 9.0.0
```

---

## 🔧 Cài Đặt Cơ Bản (Quick Start)

### Bước 1: Clone Repository
```bash
git clone <repository-url>
cd waterflow-pro
```

### Bước 2: Cài Đặt Dependencies
```bash
npm install
```

### Bước 3: Cấu Hình Environment Variables
```bash
# Copy file template
cp .env.example .env.local

# Hoặc trên Windows:
copy .env.example .env.local
```

**Lưu ý**: File `.env.local` đã có sẵn với cấu hình demo. App sẽ chạy được ngay!

### Bước 4: Chạy Development Server
```bash
npm run dev
```

### Bước 5: Mở Trình Duyệt
Truy cập: **http://localhost:3000**

🎉 **Xong!** App đã chạy ở chế độ demo.

---

## ⚙️ Cấu Hình Chi Tiết

### 1️⃣ Supabase (Bắt buộc cho Auth & Database)

#### Tạo Supabase Project:
1. Truy cập [https://supabase.com](https://supabase.com)
2. Tạo tài khoản miễn phí
3. Tạo project mới
4. Vào **Settings** → **API**
5. Copy **Project URL** và **anon public key**

#### Chạy Database Schema:
1. Vào **SQL Editor** trong Supabase Dashboard
2. Copy nội dung file `supabase/schema.sql`
3. Paste và chạy SQL

#### Cập nhật `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

### 2️⃣ SOAP API (Tùy chọn - cho tích hợp hệ thống cũ)

Nếu bạn có quyền truy cập SOAP API của hệ thống cũ:

```bash
SOAP_API_URL=http://your-soap-api-url:port/ws_Banggia.asmx
SOAP_API_USER=your-api-user
```

**Nếu không có**: Để trống, app vẫn chạy bình thường.

---

### 3️⃣ Google Sheets API (Tùy chọn - cho trạng thái khách hàng)

Xem hướng dẫn chi tiết trong file: **[GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)**

Tóm tắt:
1. Tạo Google Cloud Project
2. Enable Google Sheets API
3. Tạo Service Account
4. Download JSON key
5. Share Google Sheet với service account email

Cập nhật `.env.local`:
```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id
```

---

## 🧪 Kiểm Tra Cài Đặt

### Test 1: Server khởi động thành công
```bash
npm run dev
```
✅ Kết quả mong đợi:
```
▲ Next.js 16.1.3
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

### Test 2: Truy cập các trang
- **Home**: http://localhost:3000 ✅
- **Login**: http://localhost:3000/login ✅
- **Dashboard**: http://localhost:3000/dashboard (redirect về login nếu chưa đăng nhập) ✅

### Test 3: Kiểm tra Console
Mở terminal, kiểm tra có warnings về config:
```
⚠️  Supabase not configured - running in DEMO mode
⚠️  SOAP API not configured - legacy data integration disabled
⚠️  Google Sheets not configured - customer status will use defaults
```

Đây là **BÌNH THƯỜNG** nếu bạn chưa config đầy đủ.

---

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi: "Module not found"
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: "Port 3000 already in use"
```bash
# Đổi port khác
PORT=3001 npm run dev
```

### Lỗi: "Supabase client error"
- Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Đảm bảo không có khoảng trắng thừa
- Đảm bảo URL bắt đầu bằng `https://`

### Lỗi: "SOAP API timeout"
- Kiểm tra kết nối mạng
- Kiểm tra firewall/VPN
- Nếu không cần SOAP API, để trống env vars

---

## 📦 Scripts Có Sẵn

```bash
npm run dev      # Chạy development server (port 3000)
npm run build    # Build production
npm run start    # Chạy production server
npm run lint     # Chạy ESLint
```

---

## 🔐 Bảo Mật

- ⚠️ **KHÔNG BAO GIỜ** commit file `.env.local` lên Git
- ⚠️ **KHÔNG BAO GIỜ** share API keys/secrets công khai
- ✅ Chỉ commit file `.env.example` (không chứa giá trị thật)

---

## 📚 Tài Liệu Thêm

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

## 🆘 Cần Hỗ Trợ?

1. Kiểm tra [Issues](https://github.com/your-repo/issues) trên GitHub
2. Đọc [Troubleshooting](#-xử-lý-lỗi-thường-gặp) ở trên
3. Tạo issue mới với thông tin chi tiết về lỗi

---

**Chúc bạn code vui vẻ! 🚀**
