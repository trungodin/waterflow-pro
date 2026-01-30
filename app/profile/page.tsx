'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { updatePassword } from '@/lib/hooks/useAuth'

export default function ProfilePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  // Removed confirmPassword to simplify based on user request "thêm chức năng đổi mật khẩu" - usually just new password is core, but good UX might want confirm. Let's keep it simple first as per context or add it if standard. 
  // Actually, standard practice for "Change Password" usually asks for: 
  // 1. New Password
  // 2. Confirm New Password
  // Supabase auth update doesn't require old password if session is active.
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showPassword, setShowPassword] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Mật khẩu xác nhận không khớp.')
      return
    }

    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      await updatePassword(password)
      setStatus('success')
      setMessage('Cập nhật mật khẩu thành công! Đang chuyển hướng về Dashboard...')
      setPassword('')
      setConfirmPassword('')
      
      // Redirect to Dashboard after 1.5 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Có lỗi xảy ra khi cập nhật mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-24 px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">👤</span> Hồ Sơ Cá Nhân
              </h1>
              <p className="opacity-90 mt-1">Quản lý thông tin và bảo mật tài khoản</p>
            </div>

            <div className="p-8">
              {/* Change Password Section */}
              <div className="mb-6">
                 <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Đổi Mật Khẩu
                 </h2>
                 <p className="text-sm text-gray-500 mb-6">
                    Để bảo mật, vui lòng không chia sẻ mật khẩu của bạn với người khác.
                 </p>

                 <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-md">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 font-medium pr-12"
                                placeholder="Nhập mật khẩu mới..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                                {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Xác nhận mật khẩu mới</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 font-medium"
                            placeholder="Nhập lại mật khẩu mới..."
                        />
                    </div>

                    {status === 'success' && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 flex items-center gap-2">
                             <span className="text-xl">✅</span>
                             {message}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                             <span className="text-xl">⚠️</span>
                             {message}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu thay đổi'
                            )}
                        </button>
                    </div>
                 </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
