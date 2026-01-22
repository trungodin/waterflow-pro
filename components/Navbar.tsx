// Navigation Bar Component
// File: components/Navbar.tsx

'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💧</span>
            <span className="text-xl font-bold text-gray-900">Đội Quản lý Ghi thu nước</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Dashboard
            </Link>
            <Link href="/customers/search" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Tra cứu KH
            </Link>
            <Link href="/payments" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Thu Tiền
            </Link>
            <Link href="/login" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Đăng nhập
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
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
    </nav>
  )
}

/*
📖 GIẢI THÍCH:

1. STICKY NAVBAR:
   - fixed top-0 left-0 right-0: Dính ở đầu trang
   - z-50: Luôn ở trên cùng
   - bg-white/80: Background trắng 80% opacity
   - backdrop-blur-md: Blur background phía sau (glassmorphism)

2. CONTAINER:
   - container mx-auto: Giới hạn width, căn giữa
   - px-4: Padding ngang
   - h-16: Chiều cao 64px

3. LAYOUT:
   - flex justify-between: Logo trái, menu phải
   - items-center: Căn giữa theo chiều dọc

4. RESPONSIVE:
   - hidden md:flex: Ẩn trên mobile, hiện trên desktop
   - md:hidden: Hiện trên mobile, ẩn trên desktop

5. HOVER EFFECTS:
   - hover:text-blue-600: Đổi màu khi hover
   - transition-colors: Smooth transition

6. GLASSMORPHISM:
   - bg-white/80: Semi-transparent background
   - backdrop-blur-md: Blur effect
   - border-b: Border dưới
*/
