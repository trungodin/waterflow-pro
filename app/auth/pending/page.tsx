'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PendingApprovalPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (userProfile?.status === 'active') {
        router.push('/dashboard')
      } else if (userProfile?.status === 'rejected') {
        // Stay on this page to show rejection message
      }
    }
  }, [user, userProfile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  const isPending = userProfile?.status === 'pending'
  const isRejected = userProfile?.status === 'rejected'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl">
        {isPending && (
          <>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <span className="text-4xl">⏳</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tài khoản đang chờ phê duyệt
              </h2>
              <p className="text-gray-600 mb-6">
                Tài khoản của bạn đã được tạo thành công và đang chờ Admin phê duyệt.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Thông tin tài khoản:</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p><span className="font-medium">Email:</span> {userProfile?.email}</p>
                <p><span className="font-medium">Họ tên:</span> {userProfile?.full_name || 'Chưa cập nhật'}</p>
                <p><span className="font-medium">Vai trò yêu cầu:</span> {userProfile?.requested_role}</p>
                {userProfile?.department && (
                  <p><span className="font-medium">Phòng ban:</span> {userProfile.department}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Bước tiếp theo:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Admin sẽ xem xét yêu cầu của bạn</li>
                <li>Bạn sẽ nhận được email thông báo khi được phê duyệt</li>
                <li>Đăng nhập lại để truy cập hệ thống</li>
              </ol>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Quay lại trang đăng nhập
            </button>
          </>
        )}

        {isRejected && (
          <>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Yêu cầu đã bị từ chối
              </h2>
              <p className="text-gray-600 mb-6">
                Rất tiếc, yêu cầu tạo tài khoản của bạn đã bị từ chối.
              </p>
            </div>

            {userProfile?.notes && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-900 mb-2">Lý do:</h3>
                <p className="text-sm text-red-800">{userProfile.notes}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => router.push('/contact')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Liên hệ Admin
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Quay lại trang đăng nhập
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
