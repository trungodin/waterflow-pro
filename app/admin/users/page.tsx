'use client'

import { useEffect, useState } from 'react'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import {
  getAllUsers,
  approveUser,
  rejectUser,
  updateUserRole,
  suspendUser,
  reactivateUser,
  deleteUser,
  updateUserExtraPermissions
} from '@/lib/actions/user-management'
import { UserProfile, UserRole, UserStatus, ROLE_INFO, getRoleInfo, ROLE_PERMISSIONS, ROLE_ACTIONS, TabPermission, ActionPermission } from '@/lib/rbac/roles'
import { useAuth } from '@/lib/hooks/useAuth'

export default function UserManagementPage() {
  const { canManageUsers, loading: permLoading } = usePermissions()
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected' | 'suspended'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!permLoading && !canManageUsers) {
      router.push('/dashboard')
    }
  }, [canManageUsers, permLoading, router])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const result = await getAllUsers()
    if (result.success && result.users) {
      setUsers(result.users)
    }
    setLoading(false)
  }

  const handleApprove = async (userId: string, role: UserRole) => {
    if (!user) return
    setActionLoading(true)
    const result = await approveUser(userId, role, user.id)
    if (result.success) {
      await loadUsers()
      setSelectedUser(null)
      alert('Đã phê duyệt user thành công!')
    } else {
      alert('Lỗi: ' + result.error)
    }
    setActionLoading(false)
  }

  const handleReject = async (userId: string, notes: string) => {
    setActionLoading(true)
    const result = await rejectUser(userId, notes)
    if (result.success) {
      await loadUsers()
      setSelectedUser(null)
      alert('Đã từ chối user!')
    } else {
      alert('Lỗi: ' + result.error)
    }
    setActionLoading(false)
  }

  const handleUpdateExtraPermissions = async (
    userId: string,
    extraPermissions: { tabs?: string[]; actions?: string[] }
  ) => {
    setActionLoading(true)
    const result = await updateUserExtraPermissions(userId, extraPermissions)
    if (result.success) {
      await loadUsers()
      alert('Đã cập nhật phân quyền bổ sung!')
    } else {
      alert('Lỗi: ' + result.error)
    }
    setActionLoading(false)
  }

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    setActionLoading(true)
    const result = await updateUserRole(userId, newRole)
    if (result.success) {
      await loadUsers()
      alert('Đã thay đổi vai trò!')
    } else {
      alert('Lỗi: ' + result.error)
    }
    setActionLoading(false)
  }

  const handleSuspend = async (userId: string, notes: string) => {
    setActionLoading(true)
    const result = await suspendUser(userId, notes)
    if (result.success) {
      await loadUsers()
      alert('Đã tạm ngưng user!')
    } else {
      alert('Lỗi: ' + result.error)
    }
    setActionLoading(false)
  }

  const handleReactivate = async (userId: string) => {
    setActionLoading(true)
    const result = await reactivateUser(userId)
    if (result.success) {
      await loadUsers()
      alert('Đã kích hoạt lại user!')
    } else {
      alert('Lỗi: ' + result.error)
    }
    setActionLoading(false)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn xóa user này? Hành động này không thể hoàn tác!')) return
    setActionLoading(true)
    const result = await deleteUser(userId)
    if (result.success) {
      await loadUsers()
      setSelectedUser(null)
      alert('Đã xóa user!')
    } else {
      alert('Lỗi: ' + result.error)
    }
    setActionLoading(false)
  }

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.status === filter
    const matchesSearch = !searchTerm || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'active').length,
    rejected: users.filter(u => u.status === 'rejected').length,
    suspended: users.filter(u => u.status === 'suspended').length
  }

  if (permLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md font-medium"
              >
                <span className="text-xl">←</span>
                <span>Quay lại Dashboard</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý Users</h1>
                <p className="text-gray-600">Phê duyệt, quản lý và phân quyền người dùng</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Tổng số" value={stats.total} color="blue" onClick={() => setFilter('all')} active={filter === 'all'} />
          <StatCard label="Chờ duyệt" value={stats.pending} color="yellow" onClick={() => setFilter('pending')} active={filter === 'pending'} />
          <StatCard label="Đang hoạt động" value={stats.active} color="green" onClick={() => setFilter('active')} active={filter === 'active'} />
          <StatCard label="Bị từ chối" value={stats.rejected} color="red" onClick={() => setFilter('rejected')} active={filter === 'rejected'} />
          <StatCard label="Tạm ngưng" value={stats.suspended} color="gray" onClick={() => setFilter('suspended')} active={filter === 'suspended'} />
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Tìm kiếm theo email, tên, phòng ban..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Quản lý
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Không tìm thấy user nào</p>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onChangeRole={handleChangeRole}
          onSuspend={handleSuspend}
          onReactivate={handleReactivate}
          onDelete={handleDelete}
          onUpdateExtraPermissions={handleUpdateExtraPermissions}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({ label, value, color, onClick, active }: {
  label: string
  value: number
  color: 'blue' | 'yellow' | 'green' | 'red' | 'gray'
  onClick: () => void
  active: boolean
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  }

  const colorClass = colors[color]
  
  return (
    <div
      onClick={onClick}
      className={`${colorClass} border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        active ? 'ring-2 ring-offset-2 ring-blue-500' : ''
      }`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  )
}

// Role Badge Component
function RoleBadge({ role }: { role: UserRole }) {
  const info = getRoleInfo(role)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${info.color}-100 text-${info.color}-800`}>
      {info.icon} {info.label}
    </span>
  )
}

// Status Badge Component
function StatusBadge({ status }: { status: UserStatus }) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800'
  }

  const labels = {
    active: 'Hoạt động',
    pending: 'Chờ duyệt',
    rejected: 'Từ chối',
    suspended: 'Tạm ngưng'
  }

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  )
}

// User Detail Modal Component
function UserDetailModal({ user, onClose, onApprove, onReject, onChangeRole, onSuspend, onReactivate, onDelete, onUpdateExtraPermissions, loading }: {
  user: UserProfile
  onClose: () => void
  onApprove: (userId: string, role: UserRole) => void
  onReject: (userId: string, notes: string) => void
  onChangeRole: (userId: string, role: UserRole) => void
  onSuspend: (userId: string, notes: string) => void
  onReactivate: (userId: string) => void
  onDelete: (userId: string) => void
  onUpdateExtraPermissions: (userId: string, extra: { tabs?: string[]; actions?: string[] }) => void
  loading: boolean
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.requested_role || user.role)
  const [notes, setNotes] = useState('')

  // Extra permissions state (initialised from user data)
  const [extraTabs, setExtraTabs] = useState<TabPermission[]>(
    (user.extra_permissions?.tabs as TabPermission[]) || []
  )
  const [extraActions, setExtraActions] = useState<ActionPermission[]>(
    (user.extra_permissions?.actions as ActionPermission[]) || []
  )

  const toggleTab = (tab: TabPermission) => {
    setExtraTabs(prev =>
      prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]
    )
  }

  const toggleAction = (action: ActionPermission) => {
    setExtraActions(prev =>
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    )
  }

  // Tabs the user already gets from their role
  const roleTabs = ROLE_PERMISSIONS[user.role] || []
  const roleActions = ROLE_ACTIONS[user.role] || []

  const allTabs: { key: TabPermission; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard',    icon: '📊' },
    { key: 'ghi',       label: 'Đọc số',       icon: '📖' },
    { key: 'payments',  label: 'Thu tiền',     icon: '💰' },
    { key: 'customer',  label: 'Tra cứu KH',   icon: '🔍' },
    { key: 'users',     label: 'Quản lý Users',icon: '👥' },
  ]

  const allSubActions: { key: ActionPermission; label: string; icon: string }[] = [
    { key: 'view_doanh_thu',    label: 'Doanh thu',     icon: '💹' },
    { key: 'view_thong_bao',    label: 'Thông báo',     icon: '🔔' },
    { key: 'view_dong_mo_nuoc', label: 'Đóng mở nước', icon: '🚰' },
    { key: 'view_tra_cuu_dmn',  label: 'Tra cứu DMN',  icon: '🔎' },
    { key: 'view_mo_nuoc',      label: 'Mở nước',       icon: '💧' },
    { key: 'edit_ghi',          label: 'Sửa đọc số',    icon: '✏️' },
    { key: 'edit_payments',     label: 'Sửa thu tiền',  icon: '✏️' },
    { key: 'export_data',       label: 'Xuất dữ liệu',  icon: '📤' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-100">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">Chi tiết User</h2>
              <p className="text-sm text-gray-500">Quản lý thông tin và phân quyền</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* User Info - Improved Layout */}
          <div className="space-y-6 mb-8">
            {/* Name and Email - Prominent */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-l-4 border-blue-500">
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Họ tên</label>
                <p className="text-2xl font-bold text-gray-900 mt-1">{user.full_name || 'Chưa có tên'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <p className="text-lg text-gray-700 mt-1 font-medium">{user.email}</p>
              </div>
            </div>

            {/* Role and Status - Side by Side with Strong Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border-2 border-gray-200 p-5 rounded-xl hover:shadow-md transition-shadow">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">Vai trò hiện tại</label>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{ROLE_INFO[user.role].icon}</span>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{ROLE_INFO[user.role].label}</div>
                    <div className="text-xs text-gray-500">{ROLE_INFO[user.role].description}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border-2 border-gray-200 p-5 rounded-xl hover:shadow-md transition-shadow">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">Trạng thái</label>
                <StatusBadgeLarge status={user.status} />
              </div>
            </div>

            {/* Requested Role - Highlighted if different */}
            {user.requested_role && user.requested_role !== user.role && (
              <div className="bg-yellow-50 border-2 border-yellow-300 p-5 rounded-xl">
                <label className="text-xs font-semibold text-yellow-800 uppercase tracking-wide block mb-2">
                  ⚠️ Vai trò được yêu cầu
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ROLE_INFO[user.requested_role].icon}</span>
                  <span className="font-bold text-yellow-900 text-lg">{ROLE_INFO[user.requested_role].label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Extra Permissions Section */}
          {user.status === 'active' && (
            <div className="border-2 border-indigo-200 rounded-xl p-5 bg-indigo-50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🔐</span>
                <h3 className="text-base font-bold text-indigo-900">Phân quyền bổ sung</h3>
                <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">ngoài role gốc</span>
              </div>

              {/* Tab permissions */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">📑 Tab truy cập</p>
                <div className="grid grid-cols-2 gap-2">
                  {allTabs.map(({ key, label, icon }) => {
                    const fromRole = roleTabs.includes(key)
                    const checked = fromRole || extraTabs.includes(key)
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                          fromRole
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            : checked
                            ? 'border-indigo-400 bg-indigo-100'
                            : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={fromRole}
                          onChange={() => toggleTab(key)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="text-sm">{icon} {label}</span>
                        {fromRole && <span className="text-xs text-gray-400 ml-auto">role</span>}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Sub-action permissions */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">⚡ Hành động chi tiết</p>
                <div className="grid grid-cols-2 gap-2">
                  {allSubActions.map(({ key, label, icon }) => {
                    const fromRole = roleActions.includes(key)
                    const checked = fromRole || extraActions.includes(key)
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                          fromRole
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            : checked
                            ? 'border-indigo-400 bg-indigo-100'
                            : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={fromRole}
                          onChange={() => toggleAction(key)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="text-sm">{icon} {label}</span>
                        {fromRole && <span className="text-xs text-gray-400 ml-auto">role</span>}
                      </label>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => onUpdateExtraPermissions(user.user_id, {
                  tabs: extraTabs,
                  actions: extraActions
                })}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span>💾</span> Lưu phân quyền bổ sung
              </button>
            </div>
          )}

          {/* Actions Section - Clear Separation */}
          <div className="border-t-2 border-gray-200 pt-8 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Hành động quản lý</h3>
            
            {user.status === 'pending' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    Phê duyệt với vai trò:
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 bg-white"
                  >
                    <option value="reader">📖 Đọc số - Nhân viên đọc số đồng hồ</option>
                    <option value="collector">💰 Thu tiền - Nhân viên thu tiền</option>
                    <option value="dmn_staff">💧 Đóng mở nước - Nhân viên cắt mở nước</option>
                    <option value="manager">📊 Quản lý - Xem tất cả dữ liệu (trừ quản trị)</option>
                    <option value="admin">👑 Admin - Toàn quyền hệ thống</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onApprove(user.user_id, selectedRole)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                  >
                    <span className="text-2xl">✓</span> Phê duyệt
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Lý do từ chối:')
                      if (reason) onReject(user.user_id, reason)
                    }}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                  >
                    <span className="text-2xl">✗</span> Từ chối
                  </button>
                </div>
              </div>
            )}

            {user.status === 'active' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-900 mb-3">Thay đổi vai trò:</label>
                  <div className="flex gap-3">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 bg-white"
                    >
                      <option value="reader">📖 Đọc số</option>
                      <option value="collector">💰 Thu tiền</option>
                      <option value="dmn_staff">💧 Đóng mở nước</option>
                      <option value="manager">📊 Quản lý</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                    <button
                      onClick={() => onChangeRole(user.user_id, selectedRole)}
                      disabled={loading || selectedRole === user.role}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                      Cập nhật
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const reason = prompt('Lý do tạm ngưng:')
                    if (reason) onSuspend(user.user_id, reason)
                  }}
                  disabled={loading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="text-xl">⏸</span> Tạm ngưng tài khoản
                </button>
              </div>
            )}

            {user.status === 'suspended' && (
              <button
                onClick={() => onReactivate(user.user_id)}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">▶</span> Kích hoạt lại tài khoản
              </button>
            )}

            {/* Delete Button - Separated and Dangerous */}
            <div className="pt-4 border-t-2 border-gray-200">
              <button
                onClick={() => onDelete(user.user_id)}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border-2 border-red-700"
              >
                <span className="text-xl">🗑</span> Xóa vĩnh viễn user này
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">⚠️ Hành động này không thể hoàn tác</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Large Status Badge for Modal
function StatusBadgeLarge({ status }: { status: UserStatus }) {
  const config = {
    active: { 
      bg: 'bg-green-100', 
      text: 'text-green-800', 
      border: 'border-green-300',
      icon: '✓',
      label: 'Đang hoạt động' 
    },
    pending: { 
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800', 
      border: 'border-yellow-300',
      icon: '⏳',
      label: 'Chờ phê duyệt' 
    },
    rejected: { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      border: 'border-red-300',
      icon: '✗',
      label: 'Đã từ chối' 
    },
    suspended: { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      border: 'border-gray-300',
      icon: '⏸',
      label: 'Tạm ngưng' 
    }
  }

  const c = config[status]
  return (
    <div className={`${c.bg} ${c.text} border-2 ${c.border} px-4 py-3 rounded-lg font-bold flex items-center gap-2`}>
      <span className="text-2xl">{c.icon}</span>
      <span className="text-lg">{c.label}</span>
    </div>
  )
}
