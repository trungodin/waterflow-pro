'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Navbar from '@/components/Navbar'
import SyncButton from '@/components/SyncButton'

export default function SyncPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [isChecking, setIsChecking] = useState(true)

    const ALLOWED_EMAILS = ['trungodin@gmail.com', 'trung100982@gmail.com']

    useEffect(() => {
        if (!loading) {
            if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email)) {
                // Not allowed
                setIsChecking(false) 
            } else {
                // Allowed
                setIsChecking(false)
            }
        }
    }, [user, loading])

    if (loading || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl font-bold text-gray-500 animate-pulse">Đang kiểm tra quyền truy cập...</div>
            </div>
        )
    }

    // Access Denied View
    if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email)) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-red-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h1>
                    <p className="text-gray-600 mb-6">
                        Tài khoản <strong>{user?.email || 'Khách'}</strong> không có quyền truy cập trang quản trị này.
                    </p>
                    <button 
                        onClick={() => router.push('/')}
                        className="w-full px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 transition-colors"
                    >
                        Quay lại Trang chủ
                    </button>
                </div>
            </div>
        )
    }

    // Access Granted View
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Đồng bộ dữ liệu
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Cập nhật dữ liệu từ Google Sheets sang Supabase
                        </p>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                            <h3 className="font-semibold text-blue-900 mb-2">
                                📋 Hướng dẫn sử dụng
                            </h3>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>Click nút <strong>"Cập nhật dữ liệu"</strong> để bắt đầu đồng bộ</li>
                                <li>Dữ liệu cũ sẽ được <strong>XÓA HOÀN TOÀN</strong> trước khi cập nhật</li>
                                <li>Quá trình có thể mất <strong>2-5 phút</strong> tùy thuộc vào lượng dữ liệu</li>
                                <li>Không đóng trang trong khi đang đồng bộ</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                            <h3 className="font-semibold text-yellow-900 mb-2">
                                ⚠️ Lưu ý quan trọng
                            </h3>
                            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                                <li>Chỉ sử dụng khi cần cập nhật dữ liệu mới từ Google Sheets</li>
                                <li>Không nên chạy đồng bộ quá thường xuyên (khuyến nghị: 1 lần/ngày)</li>
                                <li>Đảm bảo Google Sheets có dữ liệu chính xác trước khi đồng bộ</li>
                            </ul>
                        </div>

                        <SyncButton />

                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-3">
                                📊 Dữ liệu được đồng bộ
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-800 mb-2">
                                        Bảng: assigned_customers
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Thông tin khách hàng được giao (từ sheet <code className="bg-gray-200 px-1 rounded">database</code>)
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Upsert theo: <code className="bg-gray-200 px-1 rounded">danh_bo</code>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Unique key: <code className="bg-gray-200 px-1 rounded">ref_id</code> (từ cột "id" trong sheet)
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-800 mb-2">
                                        Bảng: water_lock_status
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Tình trạng khóa/mở nước (từ sheet <code className="bg-gray-200 px-1 rounded">ON_OFF</code>)
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Upsert theo: <code className="bg-gray-200 px-1 rounded">id_tb</code>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Liên kết: <code className="bg-gray-200 px-1 rounded">id_tb</code> ↔ <code className="bg-gray-200 px-1 rounded">ref_id</code> (logic, không enforce)
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-800">
                                    <strong>💡 Lưu ý:</strong> Hai bảng liên kết với nhau qua <code className="bg-blue-100 px-1 rounded">id_tb = ref_id</code>. 
                                    Khi khóa nước, giá trị <code className="bg-blue-100 px-1 rounded">id</code> từ bảng database sẽ được copy sang 
                                    <code className="bg-blue-100 px-1 rounded">id_tb</code> trong bảng ON_OFF.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
