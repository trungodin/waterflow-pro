'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchMoNuocByDate, saveMoNuoc, uploadHinhMo } from '@/app/payments/mo-nuoc-actions'
import { useAuth } from '@/lib/hooks/useAuth'

// ─── Types ───────────────────────────────────────────────────────────────────
interface MoNuocRow {
    id: string
    IdTB: string
    DanhBa: string
    TenKH: string
    SoNha: string
    Duong: string
    KyNam: string
    TinhTrang: string
    NgayCpmn: string
    TgCpmn: string
    NgayMo: string
    NvMo: string
    GhiChuMo: string
    HinhKhoa: string
    HinhMo: string
    TongKy: number
    TongNo: number
    NhomKhoa: string
    KieuKhoa: string
    NgayKhoa: string
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const isLocked = (t: string) => {
    if (!t) return false
    const u = t.toUpperCase()
        .normalize('NFC')  // normalize Unicode diacritics
    return u.includes('KHOÁ') || u.includes('KHÓA') || u.includes('KHÓA')
}
const isOpened = (t: string) => {
    if (!t) return false
    const u = t.toUpperCase().normalize('NFC')
    return u.includes('ĐÃ MỞ') || u.includes('ĐA MO')
}

function fmtDate(raw: string) {
    if (!raw) return ''
    // Already DD/MM/YYYY format from DB — return as-is (may have time)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) return raw
    // ISO timestamp
    try {
        const d = new Date(raw)
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        }
    } catch {}
    return raw
}

function fmtCurrency(n: number | string) {
    const num = typeof n === 'string' ? parseFloat(n.replace(/[,.]/g, '')) : n
    if (!num || isNaN(num)) return '0'
    return num.toLocaleString('vi-VN') + ' đ'
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ row, onClose, onOpenMoNuoc }: { row: MoNuocRow; onClose: () => void; onOpenMoNuoc: () => void }) {
    const proxyUrl = (path: string) => path ? `/api/drive/image?path=${encodeURIComponent(path)}` : ''

    const infoRows = [
        { label: 'Danh bạ', value: row.DanhBa },
        { label: 'Tên KH', value: row.TenKH },
        { label: 'Địa chỉ', value: `${row.SoNha} ${row.Duong}`.trim() },
        { label: 'Tổng kỳ nợ', value: row.TongKy ? `${row.TongKy} kỳ` : '' },
        { label: 'Tổng nợ', value: row.TongNo ? fmtCurrency(row.TongNo) : '' },
        { label: 'Kỳ năm', value: row.KyNam },
        { label: 'Ngày khóa', value: fmtDate(row.NgayKhoa) },
        { label: 'Nhóm khóa', value: row.NhomKhoa },
        { label: 'Kiểu khóa', value: row.KieuKhoa },
        { label: 'Ngày CPMN', value: fmtDate(row.NgayCpmn) },
        { label: 'Tình trạng', value: row.TinhTrang },
        { label: 'Ngày mở', value: fmtDate(row.NgayMo) },
        { label: 'NV mở', value: row.NvMo },
        { label: 'Ghi chú mở', value: row.GhiChuMo },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center sticky top-0">
                    <div>
                        <div className="text-xs font-medium opacity-80">Chi tiết mở/khóa nước</div>
                        <div className="text-xl font-bold">{row.DanhBa}</div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">✕</button>
                </div>

                {/* Status Badge */}
                <div className="px-6 pt-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${isLocked(row.TinhTrang) ? 'bg-red-100 text-red-700' : isOpened(row.TinhTrang) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {row.TinhTrang || 'Không rõ'}
                    </span>
                </div>

                {/* Info List */}
                <div className="px-6 py-4 space-y-3">
                    {infoRows.filter(r => r.value).map(r => (
                        <div key={r.label} className="flex gap-3 text-sm">
                            <span className="text-gray-500 w-32 shrink-0">{r.label}</span>
                            <span className={`font-semibold text-gray-800 ${r.label === 'Tình trạng' ? (isLocked(r.value) ? 'text-red-600' : 'text-blue-600') : ''}`}>{r.value}</span>
                        </div>
                    ))}
                </div>

                {/* Images */}
                {(row.HinhKhoa || row.HinhMo) && (
                    <div className="px-6 pb-4 grid grid-cols-2 gap-3">
                        {row.HinhKhoa && (
                            <div>
                                <div className="text-xs text-gray-500 mb-1 font-medium">Hình khóa</div>
                                <a href={proxyUrl(row.HinhKhoa)} target="_blank" rel="noreferrer">
                                    <img src={proxyUrl(row.HinhKhoa)} alt="Hình khóa" className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity" onError={e => (e.currentTarget.style.display = 'none')} />
                                </a>
                            </div>
                        )}
                        {row.HinhMo && (
                            <div>
                                <div className="text-xs text-gray-500 mb-1 font-medium">Hình mở</div>
                                <a href={proxyUrl(row.HinhMo)} target="_blank" rel="noreferrer">
                                    <img src={proxyUrl(row.HinhMo)} alt="Hình mở" className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity" onError={e => (e.currentTarget.style.display = 'none')} />
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3 justify-end border-t border-gray-100 pt-4">
                    {isLocked(row.TinhTrang) && (
                        <button
                            onClick={() => { onClose(); onOpenMoNuoc() }}
                            className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
                        >
                            🔓 Mở nước
                        </button>
                    )}
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">Đóng</button>
                </div>
            </div>
        </div>
    )
}

// ─── Mo Nuoc Modal (chụp ảnh + ghi chú) ──────────────────────────────────────
function MoNuocModal({ row, userEmail, onClose, onSuccess }: {
    row: MoNuocRow
    userEmail: string
    onClose: () => void
    onSuccess: (updatedRow: Partial<MoNuocRow>) => void
}) {
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
    const [ghiChu, setGhiChu] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => setImageDataUrl(ev.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        if (!imageDataUrl) { setError('Vui lòng chụp/chọn ảnh mở nước trước khi lưu'); return }
        if (!ghiChu) { setError('Vui lòng chọn ghi chú mở nước'); return }
        setError(null)
        setIsSaving(true)

        try {
            // Upload ảnh và lưu DB song song để tăng tốc
            const [uploadRes, saveRes] = await Promise.all([
                uploadHinhMo(row.id, row.DanhBa, imageDataUrl, 'image/jpeg'),
                saveMoNuoc(row.id, ghiChu, userEmail, ''), // save DB ngay (không cần path)
            ])

            if (!saveRes.success) throw new Error(saveRes.error || 'Lỗi lưu dữ liệu')

            // Nếu upload xong và có path, cập nhật thêm path ảnh
            const hinhMoPath = uploadRes.success && uploadRes.path ? uploadRes.path : ''
            if (hinhMoPath) {
                await saveMoNuoc(row.id, ghiChu, userEmail, hinhMoPath)
            }

            onSuccess({
                TinhTrang: 'Đã mở',
                GhiChuMo: ghiChu,
                NvMo: userEmail,
                HinhMo: hinhMoPath,
                NgayMo: new Date().toLocaleString('vi-VN'),
            })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <div className="text-xs opacity-80">Mở nước</div>
                        <div className="font-bold text-lg">{row.DanhBa} – {row.TenKH}</div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">✕</button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Image box */}
                    <div
                        className={`w-full h-48 rounded-xl border-2 ${imageDataUrl ? 'border-gray-200' : 'border-red-300 border-dashed bg-red-50'} flex items-center justify-center overflow-hidden cursor-pointer relative`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {imageDataUrl ? (
                            <>
                                <img src={imageDataUrl} alt="Ảnh mở nước" className="w-full h-full object-cover rounded-xl" />
                                <button
                                    className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow"
                                    onClick={e => { e.stopPropagation(); setImageDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                                >✕</button>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="text-4xl mb-2">📷</div>
                                <div className="text-red-600 font-semibold text-sm">Chưa có ảnh mở nước *</div>
                                <div className="text-red-400 text-xs">(Bắt buộc) – Nhấn để chọn ảnh</div>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                    </div>

                    {/* Buttons chụp/chọn */}
                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"
                            onClick={() => {
                                if (fileInputRef.current) {
                                    fileInputRef.current.setAttribute('capture', 'environment')
                                    fileInputRef.current.click()
                                }
                            }}
                        >📷 Chụp ảnh</button>
                        <button
                            className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                            onClick={() => {
                                if (fileInputRef.current) {
                                    fileInputRef.current.removeAttribute('capture')
                                    fileInputRef.current.click()
                                }
                            }}
                        >🖼️ Thư viện</button>
                    </div>

                    {/* Ghi chú dropdown */}
                    <select
                        value={ghiChu}
                        onChange={e => setGhiChu(e.target.value)}
                        className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm font-medium focus:outline-none ${ghiChu ? 'border-gray-300 text-gray-800' : 'border-red-300 bg-red-50 text-red-500'}`}
                    >
                        <option value="">-- Chọn ghi chú mở nước * --</option>
                        <option value="Khách hàng xác nhận có nước">Khách hàng xác nhận có nước</option>
                        <option value="Đã gọi điện báo khách hàng">Đã gọi điện báo khách hàng</option>
                    </select>

                    {error && <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</div>}

                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all ${isSaving ? 'bg-gray-400 cursor-not-allowed' : (!imageDataUrl || !ghiChu) ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isSaving ? '⏳ Đang lưu...' : (!imageDataUrl || !ghiChu) ? '⚠️ Lưu (Thiếu thông tin)' : '💾 Lưu'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function MoNuocCard({ row, onViewDetail, onMoNuoc }: {
    row: MoNuocRow
    onViewDetail: () => void
    onMoNuoc: () => void
}) {
    const locked = isLocked(row.TinhTrang)
    const opened = isOpened(row.TinhTrang)

    return (
        <div
            className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${locked ? 'border-red-200 bg-red-50' : opened ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
            onClick={onViewDetail}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${locked ? 'bg-red-100' : 'bg-teal-100'}`}>
                        {locked ? '🔒' : '💧'}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 text-base">{row.DanhBa}</div>
                        <div className="text-sm text-gray-600">{row.TenKH}</div>
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${locked ? 'bg-red-100 text-red-700' : opened ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {row.TinhTrang || 'N/A'}
                </span>
            </div>

            <div className="mt-3 ml-13 pl-[52px] text-sm text-gray-700 font-medium">
                {row.SoNha} {row.Duong}
            </div>

            {row.NgayMo && (
                <div className="mt-1 pl-[52px] flex items-center gap-1 text-xs text-gray-500">
                    <span>🕐</span> Mở: {fmtDate(row.NgayMo)}
                </div>
            )}

            <div className="mt-3 flex justify-end">
                {locked && (
                    <button
                        onClick={e => { e.stopPropagation(); onMoNuoc() }}
                        className="px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-1"
                    >
                        🔓 Mở nước
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MoNuocTab() {
    const { user } = useAuth()
    const [rows, setRows] = useState<MoNuocRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [detailRow, setDetailRow] = useState<MoNuocRow | null>(null)
    const [moNuocRow, setMoNuocRow] = useState<MoNuocRow | null>(null)
    // Date filter — default today in YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0]
    const [selectedDate, setSelectedDate] = useState(todayStr)

    const userEmail = user?.email || ''

    const load = useCallback(async (date: string) => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchMoNuocByDate(date || todayStr)
            setRows(data as MoNuocRow[])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [todayStr])

    useEffect(() => { load(selectedDate) }, [load, selectedDate])

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value)
    }

    const resetToToday = () => setSelectedDate(todayStr)

    const isToday = selectedDate === todayStr

    const filtered = rows.filter(r => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return `${r.DanhBa} ${r.TenKH} ${r.SoNha} ${r.Duong}`.toLowerCase().includes(term)
    })

    const lockedCount = filtered.filter(r => isLocked(r.TinhTrang)).length
    const openedCount = filtered.filter(r => isOpened(r.TinhTrang)).length

    const handleMoNuocSuccess = (rowId: string, updated: Partial<MoNuocRow>) => {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, ...updated } : r))
        setMoNuocRow(null)
    }

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-teal-800 flex items-center gap-2">
                            💧 Danh sách Mở nước
                        </h2>
                        <p className="text-xs text-teal-600 mt-0.5">
                            {isToday
                                ? `Hôm nay – ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`
                                : new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                            }
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap items-center">
                        {/* Date picker */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-teal-700 whitespace-nowrap">📅 Ngày CPMN:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="px-3 py-1.5 border border-teal-200 rounded-lg text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none cursor-pointer"
                            />
                            {!isToday && (
                                <button
                                    onClick={resetToToday}
                                    className="px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
                                >
                                    ↩ Hôm nay
                                </button>
                            )}
                        </div>
                        {/* Stats badges */}
                        <div className="bg-white px-3 py-2 rounded-lg border border-teal-100 text-center">
                            <div className="text-xl font-bold text-teal-700">{filtered.length}</div>
                            <div className="text-xs text-gray-500">Tổng</div>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-lg border border-red-100 text-center">
                            <div className="text-xl font-bold text-red-600">{lockedCount}</div>
                            <div className="text-xs text-gray-500">Đang khóa</div>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 text-center">
                            <div className="text-xl font-bold text-blue-600">{openedCount}</div>
                            <div className="text-xs text-gray-500">Đã mở</div>
                        </div>
                        <button
                            onClick={() => load(selectedDate)}
                            disabled={loading}
                            className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? '⏳' : '🔄'} Làm mới
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                    type="text"
                    placeholder="Tìm danh bạ, tên KH, địa chỉ..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm">Đang tải dữ liệu...</span>
                </div>
            ) : error ? (
                <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">⚠️ {error}</div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                    <div className="text-5xl mb-3">💧</div>
                    <div className="text-base font-medium">Không có dữ liệu mở nước hôm nay</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filtered.map(row => (
                        <MoNuocCard
                            key={row.id}
                            row={row}
                            onViewDetail={() => setDetailRow(row)}
                            onMoNuoc={() => setMoNuocRow(row)}
                        />
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {detailRow && (
                <DetailModal
                    row={detailRow}
                    onClose={() => setDetailRow(null)}
                    onOpenMoNuoc={() => setMoNuocRow(detailRow)}
                />
            )}

            {/* Mo Nuoc Modal */}
            {moNuocRow && (
                <MoNuocModal
                    row={moNuocRow}
                    userEmail={userEmail}
                    onClose={() => setMoNuocRow(null)}
                    onSuccess={(updated) => handleMoNuocSuccess(moNuocRow.id, updated)}
                />
            )}
        </div>
    )
}
