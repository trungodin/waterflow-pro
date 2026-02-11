import { createClient } from '@supabase/supabase-js'

// Client này có quyền Admin (Service Role) để quản lý Auth Users
// Chỉ sử dụng trong Server Actions, KHÔNG dùng ở Client side
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
