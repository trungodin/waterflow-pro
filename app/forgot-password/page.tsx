'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { resetPassword } from '@/lib/hooks/useAuth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus('idle')
    setMessage('')
    
    try {
      await resetPassword(email)
      setStatus('success')
      setMessage('Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-16 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-3xl">🔑</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quên mật khẩu?
              </h1>
              <p className="text-gray-600">
                Nhập email để nhận liên kết đặt lại mật khẩu
              </p>
            </div>

            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fade-in">
                <div className="text-green-600 text-4xl mb-3">✉️</div>
                <h3 className="font-bold text-green-900 mb-2">Đã gửi email!</h3>
                <p className="text-green-700 text-sm mb-4">{message}</p>
                <a 
                  href="/login"
                  className="inline-block bg-green-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Quay lại đăng nhập
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 font-medium"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                     <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : (
                    'Gửi liên kết khôi phục'
                  )}
                </button>

                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="text-sm">{message}</p>
                  </div>
                )}
                
                <div className="text-center">
                  <a href="/login" className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors">
                    ← Quay lại đăng nhập
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
