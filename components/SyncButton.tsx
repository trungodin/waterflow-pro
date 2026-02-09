'use client'

import { useState } from 'react'
import { syncGoogleSheetsToSupabase } from '@/app/actions/sync'

export default function SyncButton() {
    const [syncing, setSyncing] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [showDetails, setShowDetails] = useState(false)

    const handleSync = async () => {
        if (syncing) return
        
        const confirmed = window.confirm(
            '⚠️ Bạn có chắc muốn đồng bộ dữ liệu từ Google Sheets?\n\n' +
            'Quá trình này có thể mất vài phút và sẽ cập nhật toàn bộ dữ liệu trong Supabase.'
        )
        
        if (!confirmed) return

        setSyncing(true)
        setResult(null)
        
        try {
            const res = await syncGoogleSheetsToSupabase()
            setResult(res)
            
            if (res.success) {
                alert('✅ Đồng bộ dữ liệu thành công!')
            } else {
                alert('❌ Có lỗi xảy ra khi đồng bộ. Vui lòng xem chi tiết.')
            }
        } catch (error: any) {
            setResult({
                success: false,
                errors: [error.message]
            })
            alert('❌ Lỗi: ' + error.message)
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <button
                onClick={handleSync}
                disabled={syncing}
                className={`
                    px-6 py-3 rounded-lg font-semibold text-white
                    transition-all duration-200 shadow-md
                    ${syncing 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    }
                `}
            >
                {syncing ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Đang đồng bộ...
                    </span>
                ) : (
                    '🔄 Cập nhật dữ liệu từ Google Sheets'
                )}
            </button>

            {result && (
                <div className={`
                    p-4 rounded-lg border-2
                    ${result.success 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-red-50 border-red-300'
                    }
                `}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className={`font-bold text-lg mb-2 ${
                                result.success ? 'text-green-800' : 'text-red-800'
                            }`}>
                                {result.success ? '✅ Đồng bộ thành công!' : '❌ Có lỗi xảy ra'}
                            </h3>
                            
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-700">
                                    <span className="font-semibold">Khách hàng:</span>{' '}
                                    {result.customersInserted}/{result.customersProcessed} records
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">Tình trạng khóa/mở:</span>{' '}
                                    {result.lockStatusInserted}/{result.lockStatusProcessed} records
                                </p>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowDetails(!showDetails)}
                                        className="text-sm text-red-700 underline hover:text-red-900"
                                    >
                                        {showDetails ? 'Ẩn chi tiết lỗi' : `Xem chi tiết lỗi (${result.errors.length})`}
                                    </button>
                                    
                                    {showDetails && (
                                        <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono max-h-40 overflow-y-auto">
                                            {result.errors.map((err: string, i: number) => (
                                                <div key={i} className="mb-1 text-red-800">
                                                    {i + 1}. {err}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setResult(null)}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
