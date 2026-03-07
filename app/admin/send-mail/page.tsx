'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import * as XLSX from 'xlsx'
import { sendBulkEmails, MailRow } from '@/app/actions/send-mail'

// ─── Types ───────────────────────────────────────────────────────────────────
interface PdfFileEntry { name: string; base64: string }

interface MailPreviewRow extends MailRow { idx: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildMonthList() {
    const now = new Date()
    const year = now.getFullYear()
    return Array.from({ length: 12 }, (_, i) => `${i + 1}/${year}`)
}

function currentMonthStr() {
    const now = new Date()
    return `${now.getMonth() + 1}/${now.getFullYear()}`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SendMailAdminPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()

    const ALLOWED_EMAILS = ['trungodin@gmail.com', 'trung100982@gmail.com']
    const isAllowed = !authLoading && user && ALLOWED_EMAILS.includes(user.email ?? '')

    // ── Shared state ────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'email' | 'pdf'>('email')
    const [ky, setKy] = useState(currentMonthStr())
    const [dot, setDot] = useState(1)

    // ── Email tab state ─────────────────────────────────────────────────────────
    const [mailSender, setMailSender] = useState('giaybaonuoc.capnuocbenthanh@gmail.com')
    const [mailPassword, setMailPassword] = useState('nmqaclpbiaqlnozf')
    const [showPassword, setShowPassword] = useState(false)
    const [configOpen, setConfigOpen] = useState(false)
    const [mailExcelFile, setMailExcelFile] = useState<File | null>(null)
    const [pdfAttachFiles, setPdfAttachFiles] = useState<File[]>([])
    const [mailPreview, setMailPreview] = useState<MailPreviewRow[]>([])
    const [mailLoading, setMailLoading] = useState(false)
    const [mailProgress, setMailProgress] = useState<{ sent: number; total: number } | null>(null)
    const [mailResult, setMailResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null)

    // ── PDF tab state ────────────────────────────────────────────────────────────
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfExcelFile, setPdfExcelFile] = useState<File | null>(null)
    const [pdfSplitMode, setPdfSplitMode] = useState<'normal' | 'no'>('normal')
    const [pdfLoading, setPdfLoading] = useState(false)
    const [pdfResult, setPdfResult] = useState<string | null>(null)
    const [pdfPreviewRows, setPdfPreviewRows] = useState<string[]>([])

    const mailExcelRef = useRef<HTMLInputElement>(null)
    const pdfAttachRef = useRef<HTMLInputElement>(null)
    const pdfFileRef = useRef<HTMLInputElement>(null)
    const pdfExcelRef = useRef<HTMLInputElement>(null)

    // ─── Read Excel → mail preview ─────────────────────────────────────────────
    const handleMailExcelChange = useCallback(async (file: File) => {
        setMailExcelFile(file)
        setMailResult(null)
        try {
            const buf = await file.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'buffer' })
            const sheet = wb.Sheets[wb.SheetNames[0]]
            const rows: any[] = XLSX.utils.sheet_to_json(sheet)
            const preview: MailPreviewRow[] = rows
                .filter(r => r['Email'] && r['File'])
                .map((r, i) => ({
                    idx: i + 1,
                    email: String(r['Email'] ?? '').trim(),
                    file: String(r['File'] ?? '').trim(),
                    cc: String(r['CC'] ?? '').trim(),
                    group: Number(r['Group'] ?? 0),
                }))
            setMailPreview(preview)
        } catch (e: any) {
            alert('Lỗi đọc Excel: ' + e.message)
        }
    }, [])

    // ─── Read Excel → pdf preview (danh bộ list) ─────────────────────────────
    const handlePdfExcelChange = useCallback(async (file: File) => {
        setPdfExcelFile(file)
        try {
            const buf = await file.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'buffer' })
            const sheet = wb.Sheets[wb.SheetNames[0]]
            const rows: any[] = XLSX.utils.sheet_to_json(sheet)
            setPdfPreviewRows(rows.map(r => String(r['Danh bộ'] ?? '').trim()).filter(Boolean))
        } catch (e: any) {
            alert('Lỗi đọc Excel: ' + e.message)
        }
    }, [])

    // ─── Send emails ────────────────────────────────────────────────────────────
    const handleSendEmails = async () => {
        const targetRows = mailPreview.filter(r => r.group === dot && r.email && r.file)
        if (targetRows.length === 0) {
            alert(`Không có email nào thuộc Đợt ${dot}`)
            return
        }
        if (!confirm(`Xác nhận gửi ${targetRows.length} email cho Đợt ${dot} - Kỳ ${ky}?`))
            return

        setMailLoading(true)
        setMailResult(null)
        setMailProgress({ sent: 0, total: targetRows.length })

        // Convert PDF files to base64
        const pdfFiles: PdfFileEntry[] = await Promise.all(
            pdfAttachFiles.map(async f => {
                const buf = await f.arrayBuffer()
                const base64 = Buffer.from(buf).toString('base64')
                return { name: f.name, base64 }
            })
        )

        try {
            const result = await sendBulkEmails({
                ky,
                dot,
                rows: mailPreview,
                pdfFiles,
                senderEmail: mailSender,
                senderPassword: mailPassword,
            })
            setMailResult(result)
        } catch (e: any) {
            alert('Lỗi gửi email: ' + e.message)
        } finally {
            setMailLoading(false)
            setMailProgress(null)
        }
    }

    // ─── Split PDF ───────────────────────────────────────────────────────────────
    const handleSplitPdf = async () => {
        if (!pdfFile || !pdfExcelFile) {
            alert('Vui lòng chọn file PDF và file Excel')
            return
        }
        setPdfLoading(true)
        setPdfResult(null)
        try {
            const formData = new FormData()
            formData.append('pdf', pdfFile)
            formData.append('excel', pdfExcelFile)
            formData.append('mode', pdfSplitMode)
            formData.append('month', ky)

            const res = await fetch('/api/admin/split-pdf', { method: 'POST', body: formData })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Lỗi server')
            }

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `split_pdf_${pdfSplitMode}_ky${ky.replace('/', '_')}.zip`
            a.click()
            URL.revokeObjectURL(url)

            const label = pdfSplitMode === 'no' ? 'Nợ cũ' : 'thường'
            setPdfResult(`✅ Đã cắt PDF (${label}) thành công! File ZIP đang được tải xuống.`)
        } catch (e: any) {
            setPdfResult(`❌ Lỗi: ${e.message}`)
        } finally {
            setPdfLoading(false)
        }
    }

    // ─── Auth guard ─────────────────────────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
                    <p className="text-gray-500">Đang kiểm tra quyền...</p>
                </div>
            </div>
        )
    }

    if (!isAllowed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 max-w-md text-center">
                    <div className="text-5xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h1>
                    <p className="text-gray-500 mb-4">Tài khoản không có quyền truy cập trang này.</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-5 py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition"
                    >
                        ← Quay lại Dashboard
                    </button>
                </div>
            </div>
        )
    }

    const filteredPreview = mailPreview.filter(r => r.group === dot)

    // ─── UI ─────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm font-medium"
                        >
                            ← Quay lại
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📧 Gửi GBTNN & Cắt PDF</h1>
                            <p className="text-sm text-gray-500">Gửi giấy báo tiền nước hàng loạt và cắt PDF theo danh bộ</p>
                        </div>
                    </div>
                    {/* Shared filters */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Kỳ</label>
                            <select
                                value={ky}
                                onChange={e => setKy(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            >
                                {buildMonthList().map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Đợt HĐ</label>
                            <select
                                value={dot}
                                onChange={e => setDot(Number(e.target.value))}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(d => (
                                    <option key={d} value={d}>Đợt {d}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tab nav */}
                <div className="max-w-6xl mx-auto px-4">
                    <nav className="flex gap-1">
                        {[
                            { key: 'email', label: '📧 Gửi Email', desc: 'Gửi giấy báo tiền nước hàng loạt' },
                            { key: 'pdf', label: '✂️ Cắt PDF', desc: 'Tách PDF theo danh bộ' },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key as any)}
                                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === t.key
                                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">

                {/* ══════════════ TAB: GỬI EMAIL ══════════════ */}
                {activeTab === 'email' && (
                    <div className="space-y-5">

                        {/* Card: Cấu hình Email gửi - Collapsible */}
                        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                            {/* Header toggle */}
                            <button
                                type="button"
                                onClick={() => setConfigOpen(o => !o)}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">⚙️</span>
                                    <span className="font-bold text-gray-800">Cấu hình Email gửi</span>
                                    <span className="text-xs font-normal text-gray-400">Gmail App Password</span>
                                    {!configOpen && mailSender && (
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                            ✓ {mailSender}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-gray-400 transition-transform duration-200 text-lg ${configOpen ? 'rotate-180' : ''}`}>
                                    ▾
                                </span>
                            </button>

                            {/* Collapsible body */}
                            {configOpen && (
                                <div className="px-5 pb-5 border-t border-blue-50">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Địa chỉ Email</label>
                                            <input
                                                type="email"
                                                value={mailSender}
                                                onChange={e => setMailSender(e.target.value)}
                                                placeholder="example@gmail.com"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">App Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={mailPassword}
                                                    onChange={e => setMailPassword(e.target.value)}
                                                    placeholder="xxxx xxxx xxxx xxxx"
                                                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(p => !p)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                                                    title={showPassword ? 'Ẩn' : 'Hiện'}
                                                >
                                                    {showPassword ? '🙈' : '👁️'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {mailSender && mailPassword && (
                                        <p className="mt-3 text-xs text-green-600 flex items-center gap-1">
                                            <span>✓</span> Sẽ gửi từ: <strong>{mailSender}</strong>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Card 1: Upload Excel danh sách */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-xl">📋</span> Danh sách Email
                                </h2>
                                <p className="text-xs text-gray-500 mb-3">
                                    File Excel cần các cột: <code className="bg-gray-100 px-1 rounded">Email</code>,&nbsp;
                                    <code className="bg-gray-100 px-1 rounded">File</code>,&nbsp;
                                    <code className="bg-gray-100 px-1 rounded">CC</code>,&nbsp;
                                    <code className="bg-gray-100 px-1 rounded">Group</code>
                                </p>
                                <input
                                    ref={mailExcelRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={e => e.target.files?.[0] && handleMailExcelChange(e.target.files[0])}
                                />
                                <button
                                    onClick={() => mailExcelRef.current?.click()}
                                    className="w-full border-2 border-dashed border-blue-200 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer text-sm text-blue-600 font-semibold"
                                >
                                    {mailExcelFile ? `✅ ${mailExcelFile.name}` : '📁 Chọn file Excel danh sách mail'}
                                </button>
                                {mailPreview.length > 0 && (
                                    <div className="mt-3 text-sm text-gray-600 flex gap-4">
                                        <span>📧 Tổng: <strong>{mailPreview.length}</strong></span>
                                        <span>🎯 Đợt {dot}: <strong className="text-blue-600">{filteredPreview.length}</strong></span>
                                    </div>
                                )}
                            </div>

                            {/* Card 2: Upload PDF đính kèm */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-xl">📎</span> File PDF đính kèm
                                </h2>
                                <p className="text-xs text-gray-500 mb-3">
                                    Chọn toàn bộ file PDF đã cắt (tên file phải khớp cột <code className="bg-gray-100 px-1 rounded">File</code> trong Excel)
                                </p>
                                <input
                                    ref={pdfAttachRef}
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    className="hidden"
                                    onChange={e => {
                                        if (e.target.files) setPdfAttachFiles(Array.from(e.target.files))
                                    }}
                                />
                                <button
                                    onClick={() => pdfAttachRef.current?.click()}
                                    className="w-full border-2 border-dashed border-green-200 rounded-xl p-4 text-center hover:border-green-400 hover:bg-green-50 transition cursor-pointer text-sm text-green-600 font-semibold"
                                >
                                    {pdfAttachFiles.length > 0
                                        ? `✅ Đã chọn ${pdfAttachFiles.length} file PDF`
                                        : '📁 Chọn các file PDF đính kèm (nhiều file)'}
                                </button>
                                {pdfAttachFiles.length > 0 && (
                                    <div className="mt-3 max-h-28 overflow-y-auto space-y-1">
                                        {pdfAttachFiles.slice(0, 10).map(f => (
                                            <div key={f.name} className="text-xs text-gray-500 flex items-center gap-1">
                                                <span className="text-green-500">●</span> {f.name}
                                            </div>
                                        ))}
                                        {pdfAttachFiles.length > 10 && (
                                            <div className="text-xs text-gray-400">... và {pdfAttachFiles.length - 10} file khác</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview + Send */}
                        {filteredPreview.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                        <span>👁️</span> Preview — Đợt {dot} · Kỳ {ky}
                                        <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-1">
                                            {filteredPreview.length} email
                                        </span>
                                    </h2>
                                    <button
                                        onClick={handleSendEmails}
                                        disabled={mailLoading || filteredPreview.length === 0}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
                                    >
                                        {mailLoading ? (
                                            <>
                                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Đang gửi...
                                            </>
                                        ) : (
                                            <>📤 Gửi {filteredPreview.length} email</>
                                        )}
                                    </button>
                                </div>

                                {/* Progress bar */}
                                {mailLoading && mailProgress && (
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Đang gửi...</span>
                                            <span>{mailProgress.sent} / {mailProgress.total}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                style={{ width: `${(mailProgress.sent / mailProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Result */}
                                {mailResult && (
                                    <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${mailResult.failed === 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                        }`}>
                                        ✅ Đã gửi: <strong>{mailResult.sent}</strong>
                                        {mailResult.failed > 0 && <> &nbsp;| ❌ Lỗi: <strong>{mailResult.failed}</strong></>}
                                        {mailResult.errors.length > 0 && (
                                            <ul className="mt-2 text-xs list-disc list-inside text-red-700">
                                                {mailResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Table preview */}
                                <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-bold text-gray-600">#</th>
                                                <th className="px-3 py-2 text-left font-bold text-gray-600">Email</th>
                                                <th className="px-3 py-2 text-left font-bold text-gray-600">File đính kèm</th>
                                                <th className="px-3 py-2 text-left font-bold text-gray-600">CC</th>
                                                <th className="px-3 py-2 text-center font-bold text-gray-600">Trạng thái PDF</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredPreview.map((row, i) => {
                                                const fileNames = row.file.split('-').map(f => f.trim())
                                                const allFound = fileNames.every(fn =>
                                                    pdfAttachFiles.some(f => f.name.toLowerCase() === fn.toLowerCase())
                                                )
                                                return (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                                        <td className="px-3 py-2 text-gray-800 font-medium">{row.email}</td>
                                                        <td className="px-3 py-2 text-gray-600">
                                                            {fileNames.map(fn => (
                                                                <span
                                                                    key={fn}
                                                                    className={`inline-block mr-1 px-1.5 py-0.5 rounded text-[11px] font-mono ${pdfAttachFiles.some(f => f.name.toLowerCase() === fn.toLowerCase())
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-red-100 text-red-600'
                                                                        }`}
                                                                >
                                                                    {fn}
                                                                </span>
                                                            ))}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-500">{row.cc || '—'}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            {pdfAttachFiles.length === 0
                                                                ? <span className="text-gray-400">—</span>
                                                                : allFound
                                                                    ? <span className="text-green-600 font-bold">✓</span>
                                                                    : <span className="text-red-500 font-bold">✗ thiếu</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════ TAB: CẮT PDF ══════════════ */}
                {activeTab === 'pdf' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Card: Upload PDF */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-xl">📄</span> File PDF gốc
                                </h2>
                                <input
                                    ref={pdfFileRef}
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={e => e.target.files?.[0] && setPdfFile(e.target.files[0])}
                                />
                                <button
                                    onClick={() => pdfFileRef.current?.click()}
                                    className="w-full border-2 border-dashed border-purple-200 rounded-xl p-4 text-center hover:border-purple-400 hover:bg-purple-50 transition cursor-pointer text-sm text-purple-600 font-semibold"
                                >
                                    {pdfFile ? `✅ ${pdfFile.name}` : '📁 Chọn file PDF cần cắt'}
                                </button>
                                {pdfFile && (
                                    <p className="mt-2 text-xs text-gray-400">
                                        Dung lượng: {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                )}
                            </div>

                            {/* Card: Upload Excel */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-xl">📊</span> File Excel danh bộ
                                </h2>
                                <p className="text-xs text-gray-500 mb-3">
                                    Cần cột <code className="bg-gray-100 px-1 rounded">Danh bộ</code>
                                    {' '}(và <code className="bg-gray-100 px-1 rounded">Số kỳ nợ</code>, <code className="bg-gray-100 px-1 rounded">Ghi chú</code> cho chế độ Nợ)
                                </p>
                                <input
                                    ref={pdfExcelRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={e => e.target.files?.[0] && handlePdfExcelChange(e.target.files[0])}
                                />
                                <button
                                    onClick={() => pdfExcelRef.current?.click()}
                                    className="w-full border-2 border-dashed border-orange-200 rounded-xl p-4 text-center hover:border-orange-400 hover:bg-orange-50 transition cursor-pointer text-sm text-orange-600 font-semibold"
                                >
                                    {pdfExcelFile ? `✅ ${pdfExcelFile.name}` : '📁 Chọn file Excel danh bộ'}
                                </button>
                                {pdfPreviewRows.length > 0 && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        📋 Tổng: <strong>{pdfPreviewRows.length}</strong> khách hàng
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Mode + Action */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="font-bold text-gray-800 mb-2">Chế độ cắt</h2>
                                    <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
                                        {[
                                            { key: 'normal', label: '📄 Cắt thường', desc: 'Tất cả KH theo thứ tự' },
                                            { key: 'no', label: '🔴 Cắt Nợ cũ', desc: `Lọc khách nợ (Kỳ ${ky})` },
                                        ].map(m => (
                                            <button
                                                key={m.key}
                                                onClick={() => setPdfSplitMode(m.key as any)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${pdfSplitMode === m.key
                                                    ? 'bg-white shadow-sm text-gray-900'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {m.label}
                                                <span className="block text-[10px] font-normal text-gray-400">{m.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSplitPdf}
                                    disabled={pdfLoading || !pdfFile || !pdfExcelFile}
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
                                >
                                    {pdfLoading ? (
                                        <>
                                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>✂️ Cắt PDF &amp; Tải xuống</>
                                    )}
                                </button>
                            </div>

                            {pdfResult && (
                                <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${pdfResult.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}>
                                    {pdfResult}
                                </div>
                            )}
                        </div>

                        {/* Preview rows */}
                        {pdfPreviewRows.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h2 className="font-bold text-gray-800 mb-3">
                                    👁️ Preview danh sách — {pdfSplitMode === 'no' ? 'Nợ cũ' : 'Thường'}
                                    <span className="ml-2 text-xs text-gray-400 font-normal">
                                        (Mỗi trang PDF sẽ được đặt tên theo Danh bộ)
                                    </span>
                                </h2>
                                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2 max-h-60 overflow-y-auto">
                                    {pdfPreviewRows.map((name, i) => (
                                        <div
                                            key={i}
                                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-center text-xs font-mono text-gray-700 hover:bg-purple-50 hover:border-purple-200 transition"
                                        >
                                            <div className="text-gray-400 text-[10px]">{i + 1}</div>
                                            <div className="truncate font-semibold">0{name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}
