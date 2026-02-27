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

  // Check if user can access a specific tab
  const canAccessTab = (tab: TabPermission): boolean => {
    if (!isActive) return false
    return hasTabPermission(role, tab)
  }

  // Check if user can perform a specific action
  const canPerformAction = (action: ActionPermission): boolean => {
    if (!isActive) return false
    return hasActionPermission(role, action)
  }

  // Get all allowed tabs for current user
  const allowedTabs = isActive ? getAllowedTabs(role) : []

  // Specific permission checks
  const permissions = {
    canViewDashboard: canAccessTab('dashboard'),
    canViewGhi: canAccessTab('ghi'),
    canViewPayments: canAccessTab('payments'),
    canViewDoanhThu: canPerformAction('view_doanh_thu'),
    canViewDongMoNuoc: canPerformAction('view_dong_mo_nuoc'),
    canViewTraCuuDMN: canPerformAction('view_tra_cuu_dmn'),
    canViewMoNuoc: canPerformAction('view_mo_nuoc'),
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
    ...permissions
  }
}
