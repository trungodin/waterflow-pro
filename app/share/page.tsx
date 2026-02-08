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
            setCurrentPath(item.path)
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
        return date.toLocaleString('vi-VN')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="w-full px-4 sm:px-6 lg:px-8 py-24">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">📁 Share - Quản Lý File NAS</h1>
                    <p className="text-gray-500 mt-1">Truy cập và quản lý file trên ổ cứng SSD</p>
                </div>

                {/* Toolbar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGoBack}
                                disabled={currentPath === '/G'}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                            >
                                ← Quay lại
                            </button>
                            <span className="text-sm text-gray-600 font-mono bg-gray-50 px-3 py-2 rounded-lg">
                                {currentPath}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                                {uploading ? '⏳ Đang tải...' : '📤 Upload File'}
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
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                🔄 Làm mới
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        ⚠️ {error}
                    </div>
                )}

                {/* File List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                            <p>Đang tải...</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            📂 Thư mục trống
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Tên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Kích thước
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Ngày sửa
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {files.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleNavigate(item)}
                                                    className="flex items-center gap-2 text-left hover:text-blue-600 transition-colors"
                                                >
                                                    <span className="text-2xl">
                                                        {item.type === 'directory' ? '📁' : '📄'}
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        {item.name}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {item.type === 'directory' ? '-' : formatSize(item.size)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {formatDate(item.modifiedAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.type === 'file' && (
                                                    <button
                                                        onClick={() => handleDownload(item)}
                                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        ⬇️ Tải về
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
                <div className="mt-4 text-sm text-gray-500 text-center">
                    {files.length} mục ({files.filter(f => f.type === 'directory').length} thư mục, {files.filter(f => f.type === 'file').length} file)
                </div>
            </main>
        </div>
    )
}
