# 🗄️ SUPABASE SETUP GUIDE

## 📋 BƯỚC 1: TẠO SUPABASE PROJECT

1. Vào https://supabase.com
2. Click **"New Project"**
3. Điền thông tin:
   - **Name:** waterflow-pro
   - **Database Password:** (tạo password mạnh, lưu lại!)
   - **Region:** Southeast Asia (Singapore)
   - **Pricing Plan:** Free
4. Click **"Create new project"**
5. Đợi ~2 phút để project được tạo

---

## 📋 BƯỚC 2: LẤY API CREDENTIALS

Sau khi project được tạo:

1. Vào **Settings** (icon bánh răng)
2. Click **API**
3. Copy 2 giá trị:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGci...` (key dài)

---

## 📋 BƯỚC 3: CÀI ĐẶT SUPABASE CLIENT

```bash
cd E:\waterflow-pro
npm install @supabase/supabase-js
```

---

## 📋 BƯỚC 4: TẠO .ENV.LOCAL

Tạo file `.env.local` trong root project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ LƯU Ý:** 
- Thay `your-project` và `your-anon-key-here` bằng giá trị thật
- File này sẽ được git ignore tự động

---

## 📋 BƯỚC 5: TẠO SUPABASE CLIENT

Tạo file `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 📋 BƯỚC 6: TẠO DATABASE TABLES

Vào **SQL Editor** trong Supabase Dashboard và chạy:

```sql
-- Users table (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT NOW(),
  payment_method TEXT
);
```

---

## 📋 BƯỚC 7: ENABLE ROW LEVEL SECURITY (RLS)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies (example for customers)
CREATE POLICY "Users can view their own customers"
  ON customers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## 📋 BƯỚC 8: SETUP AUTHENTICATION

Vào **Authentication** → **Providers**:

1. **Email** - Already enabled ✅
2. **Google OAuth** (optional):
   - Enable toggle
   - Add Google Client ID & Secret
   - Authorized redirect URL: Copy from Supabase

---

## 📋 BƯỚC 9: TEST CONNECTION

Tạo file `app/test-supabase/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .limit(10)
      
      if (error) console.error(error)
      else setData(data)
    }
    test()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
```

Visit: http://localhost:3000/test-supabase

---

## 📋 BƯỚC 10: ADD TO VERCEL

Khi deploy to Vercel, thêm environment variables:

1. Vào Vercel Dashboard → Your Project
2. **Settings** → **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy

---

## ✅ CHECKLIST

- [ ] Tạo Supabase project
- [ ] Copy API credentials
- [ ] Install @supabase/supabase-js
- [ ] Create .env.local
- [ ] Create lib/supabase.ts
- [ ] Create database tables
- [ ] Enable RLS
- [ ] Setup authentication
- [ ] Test connection
- [ ] Add env vars to Vercel

---

**Sau khi hoàn thành, bạn có thể:**
- ✅ Login/Register users
- ✅ Store customer data
- ✅ Create invoices
- ✅ Track payments
- ✅ Real-time updates

**Ready to build! 🚀**
