# User Management & Role-Based Access Control (RBAC) Implementation Plan

## 📊 Overview
Nâng cấp hệ thống quản lý user với phân quyền chuyên nghiệp, bao gồm đăng ký, duyệt user, và kiểm soát truy cập theo vai trò.

---

## 🎭 Role Definitions

### 1. Admin (Super User)
- **Emails:** `trungodin@gmail.com`, `trung100982@gmail.com`
- **Permissions:**
  - Toàn quyền truy cập tất cả tabs
  - Quản lý users (duyệt/từ chối/xóa/thay đổi role)
  - Cập nhật dữ liệu (Sync)
  - Truy cập NAS/Share
  - Xem logs hệ thống

### 2. Manager (Quản lý)
- **Permissions:**
  - Xem tất cả tabs (trừ Admin settings)
  - Không thể duyệt user
  - Không thể sync dữ liệu
  - Không thể truy cập NAS

### 3. Reader (Nhân viên Đọc số)
- **Permissions:**
  - Dashboard (chỉ xem)
  - Đọc số (GHI)
  - Tra cứu Khách hàng

### 4. Collector (Nhân viên Thu tiền)
- **Permissions:**
  - Dashboard (chỉ xem)
  - Thu tiền (Payments)
  - Tra cứu Khách hàng

---

## 🗄️ Database Schema

### Table: `user_profiles`
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'pending', -- 'admin', 'manager', 'reader', 'collector', 'pending'
  status TEXT NOT NULL DEFAULT 'pending', -- 'active', 'pending', 'rejected', 'suspended'
  requested_role TEXT, -- Role user yêu cầu khi đăng ký
  phone TEXT,
  department TEXT, -- Phòng ban
  notes TEXT, -- Ghi chú từ admin
  approved_by UUID REFERENCES auth.users(id), -- Admin đã duyệt
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
```

### Table: `user_activity_logs` (Optional - để audit)
```sql
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'login', 'view_page', 'export_data', etc.
  resource TEXT, -- Tab/page accessed
  metadata JSONB, -- Additional data
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📁 File Structure

```
lib/
├── rbac/
│   ├── roles.ts              # Role definitions & permissions
│   ├── permissions.ts        # Permission checker utilities
│   └── hooks/
│       └── usePermissions.ts # React hook for permission checks
├── actions/
│   └── user-management.ts    # Server actions for user CRUD
└── hooks/
    └── useAuth.ts            # Enhanced with role info

components/
├── admin/
│   ├── UserManagement.tsx    # Admin panel for managing users
│   ├── UserTable.tsx         # Table showing all users
│   ├── UserApproval.tsx      # Approve/reject pending users
│   └── RoleEditor.tsx        # Change user roles
├── auth/
│   ├── SignUpForm.tsx        # Enhanced signup with role selection
│   └── PendingApproval.tsx   # Page shown to pending users
└── Navbar.tsx                # Updated with role-based filtering

app/
├── admin/
│   └── users/
│       └── page.tsx          # User management page
└── auth/
    ├── signup/
    │   └── page.tsx          # Signup page
    └── pending/
        └── page.tsx          # Pending approval page
```

---

## 🔧 Implementation Steps

### Phase 1: Database Setup ✅
1. Create `user_profiles` table in Supabase
2. Create migration file
3. Set up Row Level Security (RLS) policies
4. Create indexes

### Phase 2: Role & Permission System ✅
1. Define role constants (`lib/rbac/roles.ts`)
2. Create permission mapping (role → allowed tabs/actions)
3. Create `usePermissions` hook
4. Create permission checker utilities

### Phase 3: Enhanced Auth ✅
1. Update `useAuth` hook to include role info
2. Create `getUserProfile` function
3. Handle role loading on app init

### Phase 4: Signup Flow ✅
1. Create enhanced signup form with:
   - Full name
   - Email
   - Password
   - Phone (optional)
   - Department (optional)
   - Requested role (dropdown)
2. Create user profile on signup (status='pending')
3. Create "Pending Approval" page
4. Email notification to admins (optional)

### Phase 5: Admin Panel ✅
1. Create User Management page (`/admin/users`)
2. Show all users in table with:
   - Email, Name, Role, Status
   - Actions: Approve, Reject, Change Role, Suspend, Delete
3. Implement approve/reject logic
4. Implement role change
5. Add search & filter

### Phase 6: Navigation & Access Control ✅
1. Update `Navbar.tsx` to filter tabs by role
2. Add route guards for protected pages
3. Show "Access Denied" for unauthorized access
4. Hide admin-only features from UI

### Phase 7: Testing & Polish ✅
1. Test all roles
2. Test signup → approval flow
3. Test role changes
4. Add loading states
5. Add error handling
6. Add success notifications

---

## 🎨 UI/UX Enhancements

### Signup Page
- Professional form with validation
- Role selection with descriptions
- Terms & conditions checkbox
- "Pending approval" message after signup

### Admin Panel
- Modern table with sorting/filtering
- Bulk actions (approve multiple, etc.)
- User details modal
- Activity logs (optional)

### Navbar
- Show user role badge
- Role-based menu items
- Profile dropdown with settings

---

## 🔐 Security Considerations

1. **RLS Policies:**
   - Users can only read their own profile
   - Only admins can update roles/status
   - Prevent privilege escalation

2. **Server-side Validation:**
   - Always verify role on server actions
   - Never trust client-side role checks

3. **Audit Logging:**
   - Log all role changes
   - Log admin actions
   - Track suspicious activity

---

## 📝 Role Permission Matrix

| Feature/Tab          | Admin | Manager | Reader | Collector |
|---------------------|-------|---------|--------|-----------|
| Dashboard           | ✅     | ✅       | ✅ (view) | ✅ (view) |
| Đọc số (GHI)        | ✅     | ✅       | ✅      | ❌        |
| Thu tiền (Payments) | ✅     | ✅       | ❌      | ✅        |
| Tra cứu KH          | ✅     | ✅       | ✅      | ✅        |
| Cập nhật DL (Sync)  | ✅     | ❌       | ❌      | ❌        |
| NAS/Share           | ✅     | ❌       | ❌      | ❌        |
| User Management     | ✅     | ❌       | ❌      | ❌        |

---

## 🚀 Deployment Checklist

- [ ] Run database migrations
- [ ] Update environment variables (if needed)
- [ ] Test signup flow
- [ ] Test admin approval
- [ ] Test role-based access
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Create admin documentation

---

## 📚 Future Enhancements

1. **Email Notifications:**
   - Notify user when approved/rejected
   - Notify admins of new signups

2. **Advanced Permissions:**
   - Custom permissions per user
   - Time-based access (temporary roles)

3. **Multi-factor Authentication (MFA)**

4. **Session Management:**
   - Force logout on role change
   - Session timeout

5. **User Groups:**
   - Group users by department
   - Assign permissions to groups
