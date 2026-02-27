'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchThongBaoByDate, saveThongBaoImage, uploadHinhThongBao, checkCustomerDebt } from '@/app/payments/thong-bao-actions'
import { useAuth } from '@/lib/hooks/useAuth'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ThongBaoRow {
    id: string
    ref_id: string
    ky_nam: string
    danh_bo: string
    ten_kh: string
    so_nha: string
    duong: string
    tong_tien: number
    tong_ky: number
    hop_bv: string
    hinh_tb: string
    ngay_goi_tb: string
    tinh_trang: string
    hinh_anh: string
    nhom: string
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const isProcessed = (t: string) => {
    if (!t) return false
    const u = t.toUpperCase().normalize('NFC')
    return u.includes('ĐÃ THANH TOÁN')
}
const isUnpaid = (t: string) => {
    if (!t) return false
    const u = t.toUpperCase().normalize('NFC')
    return u.includes('CHƯA THANH TOÁN')
}

function fmtDate(raw: string) {
    if (!raw) return ''
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) return raw
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

// ─── ThongBao Modal (chụp ảnh) ────────────────────────────────────────────────
function ThongBaoModal({ row, userEmail, onClose, onSuccess }: {
    row: ThongBaoRow
    userEmail: string
    onClose: () => void
    onSuccess: (updatedRow: Partial<ThongBaoRow>) => void
}) {
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
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
        if (!imageDataUrl) { setError('Vui lòng chụp/chọn ảnh thông báo'); return }
        setError(null)
        setIsSaving(true)

        try {
            // Upload ảnh và đợi URL
            const uploadRes = await uploadHinhThongBao(row.ref_id, row.danh_bo, imageDataUrl, 'image/jpeg')
            if (!uploadRes.success || !uploadRes.path) throw new Error(uploadRes.error || 'Lỗi lưu ảnh')

            const hinhTbPath = uploadRes.path

            // Lưu DB
            const saveRes = await saveThongBaoImage(row.ref_id, hinhTbPath)
            if (!saveRes.success) throw new Error(saveRes.error || 'Lỗi lưu dữ liệu')

            onSuccess({
                hinh_tb: hinhTbPath,
                ngay_goi_tb: saveRes.ngayGoiTb || new Date().toLocaleString('vi-VN')
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
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <div className="text-xs opacity-80">Gửi thông báo</div>
                        <div className="font-bold text-lg">{row.danh_bo} – {row.ten_kh}</div>
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
                                <img src={imageDataUrl} alt="Ảnh thông báo" className="w-full h-full object-cover rounded-xl" />
                                <button
                                    className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow"
                                    onClick={e => { e.stopPropagation(); setImageDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                                >✕</button>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="text-4xl mb-2">📷</div>
                                <div className="text-red-600 font-semibold text-sm">Chưa có ảnh thông báo</div>
                                <div className="text-red-400 text-xs">(Bắt buộc) – Nhấn để chọn ảnh</div>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                    </div>

                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
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

                    {error && <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</div>}

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all ${isSaving ? 'bg-gray-400 cursor-not-allowed' : (!imageDataUrl) ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isSaving ? '⏳ Đang lưu...' : (!imageDataUrl) ? '⚠️ Lưu (Chưa có ảnh)' : '💾 Lưu hình'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function ThongBaoCard({ row, onViewDetail, onThongBao }: {
    row: ThongBaoRow
    onViewDetail: () => void
    onThongBao: () => void
}) {
    const paid = isProcessed(row.tinh_trang)
    const unpaid = isUnpaid(row.tinh_trang)
    const proxyUrl = (path: string) => path ? `/api/drive/image?path=${encodeURIComponent(path)}` : ''

    return (
        <div
            className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${paid ? 'border-green-200 bg-green-50' : unpaid ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}
            onClick={onViewDetail}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {paid ? '✅' : '📢'}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 text-base">{row.danh_bo}</div>
                        <div className="text-sm text-gray-600">{row.ten_kh}</div>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 mb-1 ${paid ? 'bg-green-100 text-green-700' : unpaid ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {row.tinh_trang || 'Chưa kiểm tra'}
                    </span>
                    <span className="text-xs font-semibold text-red-600">{fmtCurrency(row.tong_tien)}</span>
                </div>
            </div>

            <div className="mt-3 ml-13 pl-[52px] text-sm text-gray-700 font-medium">
                {row.so_nha} {row.duong}
            </div>

            {row.ngay_goi_tb && (
                <div className="mt-1 pl-[52px] flex items-center gap-1 text-xs text-blue-600 font-bold">
                    <span>🕐</span> Thông báo: {fmtDate(row.ngay_goi_tb)}
                </div>
            )}
            
            {row.hinh_tb && (
                <div className="mt-2 pl-[52px]">
                   <img src={proxyUrl(row.hinh_tb)} className="h-20 w-auto rounded border" alt="Hình thông báo" />
                </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
                <button
                    onClick={e => { e.stopPropagation(); onThongBao() }}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                >
                    📸 Gửi Thông Báo
                </button>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ThongBaoTab() {
    const { user } = useAuth()
    const [rows, setRows] = useState<ThongBaoRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [tbRow, setTbRow] = useState<ThongBaoRow | null>(null)
    const [isCheckingDebt, setIsCheckingDebt] = useState(false)
    const [debtCheckProgress, setDebtCheckProgress] = useState(0)

    const todayStr = new Date().toISOString().split('T')[0]
    const [selectedDate, setSelectedDate] = useState(todayStr)

    const userEmail = user?.email || ''

    const load = useCallback(async (date: string) => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchThongBaoByDate(date || todayStr)
            setRows(data as ThongBaoRow[])
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

    const handleTbSuccess = (rowId: string, updated: Partial<ThongBaoRow>) => {
        setRows(prev => prev.map(r => r.ref_id === rowId ? { ...r, ...updated } : r))
        setTbRow(null)
    }

    const startDebtCheck = async () => {
        if (isCheckingDebt) return
        setIsCheckingDebt(true)
        setDebtCheckProgress(0)

        // Lọc những người chưa thanh toán hoặc chưa có tình trạng
        const toCheck = rows.filter(r => !r.tinh_trang || r.tinh_trang.toUpperCase().includes('CHƯA') || r.tinh_trang === '')

        let i = 0
        for (const row of toCheck) {
            // Check
            const res = await checkCustomerDebt(row.danh_bo)
            if (res.success) {
                const newStatus = res.isDebt ? 'CHƯA THANH TOÁN' : 'ĐÃ THANH TOÁN'
                setRows(prev => prev.map(r => r.ref_id === row.ref_id ? { ...r, tinh_trang: newStatus } : r))
            }
            // Add a small delay
            await new Promise(resolve => setTimeout(resolve, 200))
            i++
            setDebtCheckProgress(i)
        }

        setIsCheckingDebt(false)
        alert('Kiểm tra nợ hoàn tất!')
    }

    const filtered = rows.filter(r => {
        // Filter theo Search Term
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            if (!`${r.danh_bo} ${r.ten_kh} ${r.so_nha} ${r.duong}`.toLowerCase().includes(term)) {
                return false
            }
        }
        
        // Filter theo Quyền (Admin Manager thì xem được hết, còn dmn_staff/collector chỉ thấy nhóm của họ)
        if (user && user.role !== 'admin' && user.role !== 'manager') {
            // @ts-ignore
            const userNhom = (user.groups || []).map((g: any) => String(g).toLowerCase())
            const rowNhom = (r.nhom || '').toLowerCase()
            
            // Nếu user có group thì chỉ thấy group đó.
            if (userNhom.length > 0) {
                if (!userNhom.includes(rowNhom)) return false
            }
        }

        return true
    })

    const unpaidCount = filtered.filter(r => isUnpaid(r.tinh_trang)).length
    const paidCount = filtered.filter(r => isProcessed(r.tinh_trang)).length

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex flex-wrap gap-4 items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-blue-800 flex items-center gap-2">
                        📢 Danh sách Thông Báo
                    </h2>
                    <p className="text-xs text-blue-600 mt-0.5">
                        {isToday
                            ? `Hôm nay – ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`
                            : new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                        }
                    </p>
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-blue-700 whitespace-nowrap">📅 Ngày xuất DS:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="px-3 py-1.5 border border-blue-200 rounded-lg text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                        />
                        {!isToday && (
                            <button
                                onClick={resetToToday}
                                className="px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                            >
                                ↩ Hôm nay
                            </button>
                        )}
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 text-center">
                        <div className="text-xl font-bold text-blue-700">{filtered.length}</div>
                        <div className="text-xs text-gray-500">Tổng bảng</div>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg border border-orange-100 text-center">
                        <div className="text-xl font-bold text-orange-600">{unpaidCount}</div>
                        <div className="text-xs text-gray-500">Chưa TT</div>
                    </div>
                    <button
                        onClick={startDebtCheck}
                        disabled={isCheckingDebt || rows.length === 0}
                        className={`px-4 py-2 ${isCheckingDebt ? 'bg-orange-400' : 'bg-orange-500 hover:bg-orange-600'} text-white text-sm font-bold rounded-lg transition-colors`}
                    >
                        {isCheckingDebt ? `⏳ Đang kiểm... (${debtCheckProgress})` : '🔍 Auto Check Nợ'}
                    </button>
                    <button
                        onClick={() => load(selectedDate)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? '⏳' : '🔄'} Làm mới
                    </button>
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
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm">Đang tải dữ liệu...</span>
                </div>
            ) : error ? (
                <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">⚠️ {error}</div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                    <div className="text-5xl mb-3">📢</div>
                    <div className="text-base font-medium">Không có dữ liệu thông báo cho ngày {selectedDate}</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filtered.map(row => (
                        <ThongBaoCard
                            key={row.ref_id}
                            row={row}
                            onViewDetail={() => {}} // Could be modal like Mo Nuoc
                            onThongBao={() => setTbRow(row)}
                        />
                    ))}
                </div>
            )}

            {/* Mo Nuoc Modal */}
            {tbRow && (
                <ThongBaoModal
                    row={tbRow}
                    userEmail={userEmail}
                    onClose={() => setTbRow(null)}
                    onSuccess={(updated) => handleTbSuccess(tbRow.ref_id, updated)}
                />
            )}
        </div>
    )
}
