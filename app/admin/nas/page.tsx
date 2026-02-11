'use client'

import { useEffect } from 'react'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import ShareContent from '@/components/ShareContent'

export default function NASPage() {
  const { canSync, loading: permLoading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!permLoading && !canSync) {
      router.push('/dashboard')
    }
  }, [canSync, permLoading, router])

  if (permLoading) {
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
                <h1 className="text-3xl font-bold text-gray-900">📂 NAS - Đóng mở nước</h1>
                <p className="text-gray-600">Quản lý file đóng mở nước trên NAS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <ShareContent />
        </div>
      </div>
    </div>
  )
}
