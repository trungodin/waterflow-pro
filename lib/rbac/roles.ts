// Role-based Access Control (RBAC) System
// Defines roles, permissions, and access rules

export type UserRole = 'admin' | 'manager' | 'reader' | 'collector' | 'pending'
export type UserStatus = 'active' | 'pending' | 'rejected' | 'suspended'

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  role: UserRole
  status: UserStatus
  requested_role?: UserRole
  phone?: string
  department?: string
  notes?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

// Admin emails (hardcoded for security)
export const ADMIN_EMAILS = [
  'trungodin@gmail.com',
  'trung100982@gmail.com'
]

// Role metadata
export const ROLE_INFO = {
  admin: {
    label: 'Admin',
    description: 'Toàn quyền quản trị hệ thống',
    color: 'red',
    icon: '👑'
  },
  manager: {
    label: 'Quản lý',
    description: 'Xem tất cả dữ liệu (trừ quản trị)',
    color: 'purple',
    icon: '📊'
  },
  reader: {
    label: 'Đọc số',
    description: 'Nhân viên đọc số đồng hồ',
    color: 'blue',
    icon: '📖'
  },
  collector: {
    label: 'Thu tiền',
    description: 'Nhân viên thu tiền',
    color: 'green',
    icon: '💰'
  },
  pending: {
    label: 'Chờ duyệt',
    description: 'Tài khoản đang chờ phê duyệt',
    color: 'gray',
    icon: '⏳'
  }
} as const

// Tab/Page permissions
export type TabPermission = 
  | 'dashboard'
  | 'ghi'           // Đọc số
  | 'payments'      // Thu tiền
  | 'customer'      // Tra cứu KH
  | 'sync'          // Cập nhật DL
  | 'share'         // NAS
  | 'users'         // Quản lý Users

// Permission matrix: role -> allowed tabs
export const ROLE_PERMISSIONS: Record<UserRole, TabPermission[]> = {
  admin: ['dashboard', 'ghi', 'payments', 'customer', 'sync', 'share', 'users'],
  manager: ['dashboard', 'ghi', 'payments', 'customer'],
  reader: ['dashboard', 'ghi', 'customer'],
  collector: ['dashboard', 'payments', 'customer'],
  pending: [] // No access until approved
}

// Action permissions (for fine-grained control)
export type ActionPermission =
  | 'view_dashboard'
  | 'view_ghi'
  | 'edit_ghi'
  | 'view_payments'
  | 'edit_payments'
  | 'view_customer'
  | 'export_data'
  | 'sync_data'
  | 'manage_users'
  | 'approve_users'
  | 'access_nas'

export const ROLE_ACTIONS: Record<UserRole, ActionPermission[]> = {
  admin: [
    'view_dashboard',
    'view_ghi', 'edit_ghi',
    'view_payments', 'edit_payments',
    'view_customer',
    'export_data',
    'sync_data',
    'manage_users',
    'approve_users',
    'access_nas'
  ],
  manager: [
    'view_dashboard',
    'view_ghi', 'edit_ghi',
    'view_payments', 'edit_payments',
    'view_customer',
    'export_data'
  ],
  reader: [
    'view_dashboard',
    'view_ghi', 'edit_ghi',
    'view_customer'
  ],
  collector: [
    'view_dashboard',
    'view_payments', 'edit_payments',
    'view_customer'
  ],
  pending: []
}

// Helper functions
export function hasTabPermission(role: UserRole, tab: TabPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(tab) ?? false
}

export function hasActionPermission(role: UserRole, action: ActionPermission): boolean {
  return ROLE_ACTIONS[role]?.includes(action) ?? false
}

export function isAdmin(email?: string): boolean {
  return email ? ADMIN_EMAILS.includes(email.toLowerCase()) : false
}

export function canApproveUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canSyncData(role: UserRole): boolean {
  return role === 'admin'
}

export function canAccessNAS(role: UserRole): boolean {
  return role === 'admin'
}

// Get allowed tabs for a role
export function getAllowedTabs(role: UserRole): TabPermission[] {
  return ROLE_PERMISSIONS[role] || []
}

// Check if user is active
export function isActiveUser(status: UserStatus): boolean {
  return status === 'active'
}

// Get role display info
export function getRoleInfo(role: UserRole) {
  return ROLE_INFO[role] || ROLE_INFO.pending
}
