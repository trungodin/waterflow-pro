'use client'

import React, { useState } from 'react'
import * as XLSX from 'xlsx'

interface DetailsProps {
    data: any[]
}

export default function WeeklyReportDetails({ data }: DetailsProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const filteredData = data.filter(item => {
        const matchesSearch =
            item.DanhBa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.TenKH?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.Duong?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || item.ComputedStatus === statusFilter

        return matchesSearch && matchesStatus
    })

    const handleExportExcel = () => {
        // Prepare data for Excel
        const excelData = filteredData.map(item => ({
            'Danh bạ': item.DanhBa,
            'Tên KH': item.TenKH,
            'Ngày Giao DS': item.NgayGiao,
            'Tình Trạng Nợ': item.ComputedStatus,
            'Ngày TT': item.PaymentDate || '',
            'KỲ chưa TT': item.RemainingUnpaidPeriods || '',
            'Số nhà': item.SoNha,
            'Đường': item.Duong,
            'Nhóm': item.Nhom,
            'Ghi chú': item.GhiChu || '',
            'Tình trạng': item.TinhTrang || '',
            'Đợt': item.Dot || '',
            'Kỳ Năm': item.KyNam || '',
            'GB': item.GB || '',
            'Tổng tiền': item.TongTien || '',
            'Tổng kỳ': item.TongKy || '',
            'Hộp bảo vệ': item.HopBaoVe || ''
        }))

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData)

        // Create workbook
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Chi tiết')

        // Generate filename with current date
        const now = new Date()
        const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`
        const filename = `BaoCaoTuan_ChiTiet_${dateStr}.xlsx`

        // Download
        XLSX.writeFile(wb, filename)
    }


    // --- Column Resizing Logic ---
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        stt: 50,
        danhBa: 110,
        tenKH: 180,
        diaChi: 250,
        tongTien: 100,
        tongKy: 80,
        ngayGiao: 100,
        kyChuaTT: 150, // Added default width for 'Kỳ chưa TT'
        kyNam: 120,
        gb: 50,
        dot: 50,
        hop: 50,
        ghiChu: 150,
        trangThai: 130,
        ngayTT: 110
    })

    const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
        // ... (resize logic remains same)
        e.preventDefault()
        const startX = e.pageX
        const startWidth = colWidths[colKey]

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.pageX - startX
            setColWidths(prev => ({
                ...prev,
                [colKey]: Math.max(50, startWidth + deltaX) // Min width 50px
            }))
        }

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    // Helper for Resizable Header (remains same)
    const ResizableTh = ({ colKey, label, className = '' }: { colKey: string, label: string, className?: string }) => (
        <th
            className={`px-2 py-3 border-r border-slate-200 relative group select-none ${className}`}
            style={{ width: colWidths[colKey], minWidth: colWidths[colKey] }}
        >
            <div className="flex items-center justify-between h-full">
                <span className="truncate w-full">{label}</span>
                {/* Resizer Handle */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-20"
                    onMouseDown={(e) => handleMouseDown(e, colKey)}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </th>
    )

    return (
        <div>
            {/* Local Toolbar (remains same) */}
            <div className="p-4 bg-white border-b border-slate-300 flex gap-4 flex-wrap items-center">
                {/* ... filters ... */}
                <div className="relative flex-1 min-w-[250px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-lg font-bold">🔍</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm danh bạ, tên, địa chỉ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-400 rounded-lg text-sm bg-white font-bold text-black focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none placeholder:text-gray-500"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="p-2.5 min-w-[180px] border-2 border-slate-400 rounded-lg text-sm bg-white font-bold text-black outline-none focus:ring-2 focus:ring-blue-600"
                >
                    <option value="all" className="text-black font-bold">Tất cả trạng thái</option>
                    <option value="Đã Thanh Toán" className="text-green-700 font-bold">✅ Đã Thanh Toán</option>
                    <option value="Chưa Thanh Toán" className="text-orange-600 font-bold">⏳ Chưa Thanh Toán</option>
                    <option value="Khóa nước" className="text-red-600 font-bold">🔒 Khóa nước</option>
                </select>

                <button
                    onClick={handleExportExcel}
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                    <span>📊</span>
                    <span>Xuất Excel</span>
                </button>

                <div className="text-sm font-bold text-slate-700">
                    Hiển thị: <span className="text-blue-600">{filteredData.length}</span> / {data.length} khách hàng
                </div>
            </div>

            <div className="overflow-auto max-h-[600px] border border-slate-200">
                <table className="w-full text-sm text-left border-collapse table-fixed">
                    <thead className="bg-slate-100 text-slate-900 font-bold text-xs sticky top-0 z-10 shadow-sm border-b border-slate-300">
                        <tr>
                            <ResizableTh colKey="stt" label="STT" />
                            <ResizableTh colKey="danhBa" label="Danh Bạ" />
                            <ResizableTh colKey="tenKH" label="Tên Khách Hàng" />
                            <ResizableTh colKey="ngayGiao" label="Ngày Giao" />
                            <ResizableTh colKey="trangThai" label="Tình Trạng" className="text-center" />
                            <ResizableTh colKey="ngayTT" label="Ngày TT" className="text-right" />
                            <ResizableTh colKey="kyChuaTT" label="Kỳ chưa TT" />
                            <ResizableTh colKey="diaChi" label="Địa Chỉ" />
                            <ResizableTh colKey="tongKy" label="Tổng kỳ" className="text-center" />
                            <ResizableTh colKey="tongTien" label="Tổng tiền" className="text-right" />
                            <ResizableTh colKey="kyNam" label="Kỳ năm" />
                            <ResizableTh colKey="gb" label="GB" className="text-center" />
                            <ResizableTh colKey="dot" label="Đợt" className="text-center" />
                            <ResizableTh colKey="hop" label="Hộp" className="text-center" />
                            <ResizableTh colKey="ghiChu" label="Ghi chú" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredData.map((row, idx) => {
                            const statusColor =
                                row.ComputedStatus === 'Đã Thanh Toán' ? 'bg-green-100 text-green-800 border-green-200' :
                                    row.ComputedStatus === 'Khóa nước' ? 'bg-red-100 text-red-800 border-red-200' :
                                        'bg-orange-50 text-orange-800 border-orange-200'

                            return (
                                <tr key={idx} className="hover:bg-blue-50 group border-b border-slate-200">
                                    <td className="px-2 py-2 text-slate-500 text-xs font-semibold border-r border-slate-100 text-center truncate">{idx + 1}</td>
                                    <td className="px-2 py-2 font-mono font-bold text-slate-900 group-hover:text-blue-700 transition-colors border-r border-slate-100 truncate">
                                        {row.DanhBa}
                                    </td>
                                    <td className="px-2 py-2 font-bold text-slate-800 border-r border-slate-100 text-xs truncate">
                                        {row.TenKH}
                                        {row.GB === '31' && <span className="ml-1 text-[9px] bg-purple-100 text-purple-800 px-1 rounded font-bold border border-purple-200">CQ</span>}
                                    </td>
                                    <td className="px-2 py-2 text-slate-800 font-medium truncate border-r border-slate-100 text-xs">{row.NgayGiao}</td>
                                    <td className="px-2 py-2 text-center border-r border-slate-100 truncate">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${statusColor}`}>
                                            {row.ComputedStatus}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono font-bold text-slate-700 text-xs truncate">
                                        {row.PaymentDate || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-red-600 font-bold text-xs truncate border-r border-slate-100 font-mono" title={row.RemainingUnpaid}>
                                        {row.RemainingUnpaid || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-slate-700 font-medium text-xs truncate border-r border-slate-100" title={`${row.SoNha} ${row.Duong}`}>
                                        {row.SoNha} {row.Duong}
                                    </td>
                                    <td className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-100 text-xs truncate">
                                        {row.TongKy || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono font-bold text-slate-700 border-r border-slate-100 text-xs truncate">
                                        {row.TongTien ? parseInt(row.TongTien).toLocaleString('vi-VN') : '-'}
                                    </td>
                                    <td className="px-2 py-2 text-slate-600 text-[10px] truncate border-r border-slate-100 font-mono" title={row.KyNam}>
                                        {row.KyNam || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-center text-slate-600 text-xs truncate border-r border-slate-100">{row.GB || '-'}</td>
                                    <td className="px-2 py-2 text-center text-slate-600 text-xs truncate border-r border-slate-100">{row.Dot || '-'}</td>
                                    <td className="px-2 py-2 text-center text-slate-600 text-xs truncate border-r border-slate-100">{row.HopBaoVe || '-'}</td>
                                    <td className="px-2 py-2 text-slate-600 text-xs truncate border-r border-slate-100 italic" title={row.GhiChu}>
                                        {row.GhiChu || ''}
                                    </td>
                                </tr>
                            )
                        })}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={15} className="text-center py-12 text-slate-500 font-medium">
                                    Không tìm thấy dữ liệu phù hợp
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-2 bg-slate-100 border-t border-slate-300 text-xs text-slate-600 font-semibold text-center">
                Hiển thị {filteredData.length} kết quả
            </div>
        </div>
    )
}
