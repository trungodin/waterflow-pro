'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

interface FileInfo {
    name: string
    type: 'file' | 'directory'
    size: number
    modifiedAt: string
    path: string
}

export default function SharePage() {
    const [files, setFiles] = useState<FileInfo[]>([])
    const [currentPath, setCurrentPath] = useState('/G')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadFiles(currentPath)
    }, [currentPath])

    const loadFiles = async (path: string) => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/ftp/list?path=${encodeURIComponent(path)}`)
            const data = await res.json()

            if (data.success) {
                setFiles(data.files)
            } else {
                setError(data.error || 'Lỗi tải danh sách file')
            }
        } catch (err) {
            setError('Không thể kết nối tới server')
        } finally {
            setLoading(false)
        }
    }

    const handleNavigate = (item: FileInfo) => {
        if (item.type === 'directory') {
            // Check if this is a large image directory that would timeout
            const largeImageDirs = ['database_Images', 'ON_OFF_Images'];
            if (largeImageDirs.includes(item.name)) {
                setError(`⚠️ Thư mục "${item.name}" chứa quá nhiều file (hàng ngàn ảnh). Không thể hiển thị danh sách. Các ảnh sẽ tự động load khi xem thông tin khách hàng.`);
                return;
            }
            setCurrentPath(item.path);
        }
    }

    const handleGoBack = () => {
        const parts = currentPath.split('/').filter(Boolean)
        if (parts.length > 1) {
            parts.pop()
            setCurrentPath('/' + parts.join('/'))
        }
    }

    const handleDownload = async (item: FileInfo) => {
        try {
            const res = await fetch(`/api/ftp/download?path=${encodeURIComponent(item.path)}`)
            if (!res.ok) throw new Error('Download failed')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = item.name
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            alert('Lỗi tải file')
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', currentPath)

        try {
            const res = await fetch('/api/ftp/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (data.success) {
                alert('Upload thành công!')
                loadFiles(currentPath)
            } else {
                alert(data.error || 'Lỗi upload')
            }
        } catch (err) {
            alert('Lỗi upload file')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '-'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            <Navbar />

            <main className="w-full px-4 sm:px-6 lg:px-8 py-24">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">NAS</h1>
                            <p className="text-gray-600 font-medium mt-0.5">Truy cập và quản lý dữ liệu tập trung</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-5 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleGoBack}
                                disabled={currentPath === '/G'}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-gray-700 transition-all shadow-sm hover:shadow-md disabled:hover:shadow-sm border border-slate-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                                Quay lại
                            </button>
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className="text-sm font-bold text-blue-900 font-mono">
                                    {currentPath}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {uploading ? 'Đang tải...' : 'Upload File'}
                                <input
                                    type="file"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>
                            <button
                                onClick={() => loadFiles(currentPath)}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 rounded-xl text-sm font-bold text-gray-700 transition-all shadow-sm hover:shadow-md border border-slate-200"
                            >
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Làm mới
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 text-red-800 px-5 py-4 rounded-2xl mb-6 flex items-center gap-3 shadow-lg shadow-red-100">
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                {/* File List */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
                    {loading ? (
                        <div className="p-16 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-200 animate-pulse">
                                <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <p className="text-gray-700 font-bold text-lg">Đang tải dữ liệu...</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-4">
                                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-600 font-bold text-lg">Thư mục trống</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                            Tên File
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                            Kích thước
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                            Ngày sửa đổi
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {files.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-blue-50/50 transition-all duration-200 group"
                                        >
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleNavigate(item)}
                                                    className="flex items-center gap-3 text-left group-hover:text-blue-600 transition-colors w-full"
                                                    disabled={item.type === 'file'}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'directory'
                                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-200'
                                                            : 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md shadow-blue-200'
                                                        }`}>
                                                        {item.type === 'directory' ? (
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {item.name}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-gray-700">
                                                    {item.type === 'directory' ? '-' : formatSize(item.size)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-gray-600">
                                                    {formatDate(item.modifiedAt)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.type === 'file' && (
                                                    <button
                                                        onClick={() => handleDownload(item)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 hover:-translate-y-0.5"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                                        </svg>
                                                        Tải về
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-6 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm font-bold text-gray-900">
                                Tổng: <span className="text-blue-600">{files.length}</span> mục
                            </span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="text-sm font-bold text-gray-700">
                                {files.filter(f => f.type === 'directory').length} thư mục
                            </span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-bold text-gray-700">
                                {files.filter(f => f.type === 'file').length} file
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
