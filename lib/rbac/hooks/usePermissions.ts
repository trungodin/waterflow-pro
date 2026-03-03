'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { 
  UserRole, 
  TabPermission, 
  ActionPermission,
  hasTabPermission,
  hasActionPermission,
  getAllowedTabs,
  isActiveUser
} from '../roles'

export function usePermissions() {
  const { user, userProfile, loading } = useAuth()

  const role: UserRole = userProfile?.role || 'pending'
  const status = userProfile?.status || 'pending'
  const isActive = isActiveUser(status)

  // Extra permissions stored per-user in DB
  const extraTabs: TabPermission[] = userProfile?.extra_permissions?.tabs || []
  const extraActions: ActionPermission[] = userProfile?.extra_permissions?.actions || []

  // Check if user can access a specific tab (role OR extra)
  const canAccessTab = (tab: TabPermission): boolean => {
    if (!isActive) return false
    return hasTabPermission(role, tab) || extraTabs.includes(tab)
  }

  // Check if user can perform a specific action (role OR extra)
  const canPerformAction = (action: ActionPermission): boolean => {
    if (!isActive) return false
    return hasActionPermission(role, action) || extraActions.includes(action)
  }

  // Get all allowed tabs for current user (union of role + extra)
  const allowedTabs = isActive
    ? [...new Set([...getAllowedTabs(role), ...extraTabs])]
    : []

  // Specific permission checks
  const permissions = {
    canViewDashboard: canAccessTab('dashboard'),
    canViewGhi: canAccessTab('ghi'),
    canViewPayments: canAccessTab('payments'),
    canViewDoanhThu: canPerformAction('view_doanh_thu'),
    canViewDongMoNuoc: canPerformAction('view_dong_mo_nuoc'),
    canViewTraCuuDMN: canPerformAction('view_tra_cuu_dmn'),
    canViewMoNuoc: canPerformAction('view_mo_nuoc'),
    canViewThongBao: canPerformAction('view_thong_bao'),
    canViewCustomer: canAccessTab('customer'),
    canSync: canAccessTab('sync'),
    canAccessNAS: canAccessTab('share'),
    canManageUsers: canAccessTab('users'),
    
    // Action-level permissions
    canEditGhi: canPerformAction('edit_ghi'),
    canEditPayments: canPerformAction('edit_payments'),
    canExportData: canPerformAction('export_data'),
    canApproveUsers: canPerformAction('approve_users'),
  }

  return {
    role,
    status,
    isActive,
    loading,
    canAccessTab,
    canPerformAction,
    allowedTabs,
    extraTabs,
    extraActions,
    ...permissions
  }
}
