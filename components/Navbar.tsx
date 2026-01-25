'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Be_Vietnam_Pro } from 'next/font/google'

const brandFont = Be_Vietnam_Pro({
  subsets: ['vietnamese'],
  weight: ['700', '800', '900']
})

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Dashboard', path: '/dashboard', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
      )
    },
    {
      name: 'Tra cứu KH', path: '/customers/search', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      )
    },
    {
      name: 'Thu Tiền', path: '/payments', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
      )
    }
  ]

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
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200
                      ${isActive
                        ? 'bg-white text-blue-600 shadow-sm shadow-slate-200'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                      }
                    `}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Login/Profile Action */}
            <div className="pl-4 border-l border-slate-200">
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-blue-200"
              >
                <span>Đăng nhập</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
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
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
