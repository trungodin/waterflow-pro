'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Be_Vietnam_Pro } from 'next/font/google'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import { getRoleInfo } from '@/lib/rbac/roles'

const brandFont = Be_Vietnam_Pro({
  subsets: ['vietnamese'],
  weight: ['700', '800', '900']
})

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  // FIX: Get signOut from context
  const { user, userProfile, loading, signOut } = useAuth()
  const permissions = usePermissions()
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [forceShowMenu, setForceShowMenu] = useState(false)

  // Fallback: Force show menu after 2 seconds if still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (permissions.loading) {
        console.warn('[Navbar] Loading timeout - forcing menu display')
        setForceShowMenu(true)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [permissions.loading])

  const handleSignOut = () => {
    // Fire and forget logout
    signOut().catch(console.error)
    
    // Force hard reload to login page immediately regardless of signOut status
    // Using setTimeout ensures this runs in the next tick
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
  }

  const rawNavItems = [
    {
      name: 'Dashboard', 
      path: '/dashboard', 
      permission: 'dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
      )
    },
    {
      name: 'Tra cứu KH', 
      path: '/customers/search', 
      permission: 'customer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      )
    },
    {
      name: 'Đọc Số', 
      path: '/readings', 
      permission: 'ghi',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      )
    },
    {
      name: 'Thu Tiền', 
      path: '/payments', 
      permission: 'payments',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
      )
    },
  ]

  // Admin dropdown items
  const adminMenuItems = [
    {
      name: 'Cập nhật DL',
      path: '/admin/sync',
      permission: 'sync',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      )
    },
    {
      name: 'Quản lý Users',
      path: '/admin/users',
      permission: 'users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      )
    },
    {
      name: 'NAS',
      path: '/admin/nas',
      permission: 'sync', // Use sync permission for now (admin only)
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
      )
    },
  ]

  // Filter nav items based on permissions
  const isLoading = permissions.loading && !forceShowMenu
  
  const navItems = isLoading
    ? [] // Empty only during loading - prevents flash
    : !user // No authenticated user
    ? rawNavItems.filter(item => item.permission === 'dashboard') // Show only dashboard if not logged in
    : !userProfile // User logged in but no profile yet
    ? rawNavItems.filter(item => item.permission === 'dashboard') // Show only dashboard while profile loads
    : rawNavItems.filter(item => {
        const canAccess = permissions.canAccessTab(item.permission as any)
        console.log(`[Navbar] Tab: ${item.name}, Permission: ${item.permission}, Can Access: ${canAccess}, Role: ${userProfile?.role}`)
        return canAccess
      })

  // Filter admin menu items
  const filteredAdminItems = !user || !userProfile
    ? [] // Empty if no user or no profile
    : adminMenuItems.filter(item => permissions.canAccessTab(item.permission as any))

  // Check if user has any admin permissions
  const hasAdminAccess = filteredAdminItems.length > 0

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-blue-200 shadow-lg group-hover:shadow-blue-300 transition-all duration-300">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12a1 1 0 00-1-1v-1a1 1 0 00-1-1H6a1 1 0 00-1 1v1a1 1 0 00-1 1h14zM4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6H4zM12 4.354a4 4 0 110 5.292 4 4 0 010-5.292z" /></svg>
            </div>
            <div className="flex flex-col">
              <span className={`text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-800 to-cyan-700 tracking-tight ${brandFont.className}`}>QUẢN LÝ GHI THU NƯỚC</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none ml-0.5">Dashboard</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 mr-4">
              {navItems.map((item) => {
                const isActive = pathname === item.path
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300
                      ${isActive
                        ? 'bg-white text-blue-600 shadow-md shadow-blue-100 scale-105'
                        : 'text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-lg hover:shadow-blue-100/50 hover:scale-105 hover:-translate-y-1'
                      }
                    `}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Admin Dropdown */}
              {hasAdminAccess && (
                <div className="relative">
                  <button
                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300
                      ${pathname.startsWith('/admin')
                        ? 'bg-white text-blue-600 shadow-md shadow-blue-100 scale-105'
                        : 'text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-lg hover:shadow-blue-100/50 hover:scale-105 hover:-translate-y-1'
                      }
                    `}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Admin
                    <svg className={`w-4 h-4 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  
                  {adminDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                      {filteredAdminItems.map((item) => {
                        const isActive = pathname === item.path
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`
                              flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all
                              ${isActive
                                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                              }
                            `}
                          >
                            {item.icon}
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Login/Profile Action */}
            <div className="pl-4 border-l border-slate-200">
              {loading ? (
                <div className="w-24 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                      {user.email?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-bold text-slate-700 max-w-[140px] truncate">
                        {(() => {
                        console.log('User Metadata:', user.user_metadata) 
                        return userProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || user.email?.split('@')[0]
                      })()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {userProfile ? getRoleInfo(userProfile.role).label : 'Thành viên'}
                      </span>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-sm font-bold text-slate-900">Tài khoản</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Hồ sơ cá nhân
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-blue-300"
                >
                  <span>Đăng nhập</span>
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-100 shadow-xl transition-all duration-300 origin-top transform ${isMobileMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
          }`}
      >
        <div className="px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                  ${pathname === item.path
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }
                `}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
          <div className="pt-4 mt-2 border-t border-slate-100 p-4">
            {loading ? null : user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm">
                    {user.email?.[0] || 'U'}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm font-bold text-slate-800 truncate w-full">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Thành viên</span>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Hồ sơ cá nhân
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
