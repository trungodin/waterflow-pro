# Cách lấy Google Sheet ID

## Bước 1: Mở Google Sheet "Thông báo - Khoá nước"

## Bước 2: Copy Sheet ID từ URL
URL có dạng:
```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
```

Ví dụ:
```
https://docs.google.com/spreadsheets/d/1a2B3c4D5e6F7g8H9i0J/edit
```
→ Sheet ID là: `1a2B3c4D5e6F7g8H9i0J`

## Bước 3: Thêm vào .env.local

Mở file `.env.local` và thay thế:
```env
GOOGLE_SHEET_ID=YOUR_SHEET_ID_HERE
```

Thành:
```env
GOOGLE_SHEET_ID=1a2B3c4D5e6F7g8H9i0J
```

## Bước 4: Restart dev server

```bash
# Dừng server (Ctrl+C)
# Chạy lại
npm run dev
```

## Xong!

Bây giờ "Tình trạng" sẽ được lấy từ Google Sheets ON_OFF sheet.
