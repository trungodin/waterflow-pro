'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { CustomerLatenessStatus } from '@/lib/analysis/payment-lateness'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface LatenessDetailTableProps {
    data: CustomerLatenessStatus[] | undefined
    filteredClassification?: string | null
}

export default function LatenessDetailTable({ data, filteredClassification }: LatenessDetailTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const pageSize = 50

    // Reset pagination when data changes
    useEffect(() => {
        setPage(1)
    }, [data])

    // 1. Filter Logic
    const filteredData = useMemo(() => {
        if (!data) return []
        let result = data

        // Filter by Classification (if selected from pie chart)
        if (filteredClassification) {
            result = result.filter(d => d.CLASSIFICATION === filteredClassification)
        }

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase()
            result = result.filter(d =>
                d.DANHBA.includes(lower) ||
                d.TENKH.toLowerCase().includes(lower) ||
                d.DIACHI.toLowerCase().includes(lower)
            )
        }

        return result
    }, [data, filteredClassification, searchTerm])

    const paginatedData = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredData.slice(start, start + pageSize)
    }, [filteredData, page])

    const totalPages = Math.ceil(filteredData.length / pageSize)

    if (!data || data.length === 0) return null

    // Determine dynamic period columns from first record (if any)
    const periods = data.length > 0 ? Object.keys(data[0].PAYMENT_STATUS_BY_PERIOD || {}).sort((a, b) => {
        // Sort MM/YYYY
        const [m1, y1] = a.split('/').map(Number)
        const [m2, y2] = b.split('/').map(Number)
        return y1 - y2 || m1 - m2
    }) : []

    // Helper to colorize status
    const getStatusColor = (status: string) => {
        if (status === 'Đúng hạn') return 'text-blue-600 font-medium'
        if (status === 'Trễ hạn') return 'text-orange-500'
        if (status === 'Chưa thanh toán') return 'text-red-500 font-bold'
        return 'text-gray-500' // If date string
    }

    // Format money
    const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

    // Export Logic
    const handleExportExcel = () => {
        if (!filteredData || filteredData.length === 0) return

        // 1. Prepare Data for Excel
        const excelData = filteredData.map(item => {
            const row: any = {
                'Danh Bộ': item.DANHBA,
                'Khách Hàng': item.TENKH,
                'Địa Chỉ': item.DIACHI,
                'Đợt': item.DOT,
                'MLT': item.MLT,
                'Tổng Nợ': item.TONGCONG_BD,
                'Tỷ Lệ Đúng Hạn (%)': item.ON_TIME_RATE,
                'Phân Loại': item.CLASSIFICATION
            }

            // Add dynamic periods
            periods.forEach(p => {
                row[`Kỳ ${p}`] = item.PAYMENT_STATUS_BY_PERIOD[p] || ''
            })

            return row
        })

        // 2. Create Worksheet
        const ws = XLSX.utils.json_to_sheet(excelData)

        // 3. Create Workbook
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Chi Tiết Thanh Toán")

        // 4. Write Buffer and Save
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        saveAs(dataBlob, `PhanTichThanhToan_${timestamp}.xlsx`)
    }
    // Column Resizing Logic
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        danhBa: 120,
        khachHang: 300,
        diaChi: 350,
        dot: 80,
        mlt: 100,
        tongNo: 150,
        tyLe: 80
    })
    const [resizingCol, setResizingCol] = useState<string | null>(null)
    const resizeStartX = useRef<number>(0)
    const resizeStartWidth = useRef<number>(0)

    const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
        setResizingCol(colKey)
        resizeStartX.current = e.clientX
        resizeStartWidth.current = columnWidths[colKey] || 100

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        e.preventDefault()
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizeStartX.current) return
        const diff = e.clientX - resizeStartX.current
        const newWidth = Math.max(50, resizeStartWidth.current + diff)

        setResizingCol(prev => {
            if (prev) {
                setColumnWidths(widths => ({
                    ...widths,
                    [prev]: newWidth
                }))
                return prev
            }
            return null
        })
    }

    const handleMouseUp = () => {
        setResizingCol(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }

    // Resizer Component
    const Resizer = ({ colKey }: { colKey: string }) => (
        <div
            onMouseDown={(e) => handleMouseDown(e, colKey)}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20 group-hover:bg-gray-300"
            style={{ touchAction: 'none' }}
        />
    )

    return (
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm animate-in fade-in duration-500">
            <div className="p-4 border-b border-gray-300 flex flex-wrap justify-between items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-800">📋 Danh Sách Chi Tiết ({filteredData.length})</h3>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-1 shadow-sm transition-colors"
                        title="Xuất file Excel"
                    >
                        📥 Xuất Excel
                    </button>
                    <input
                        type="text"
                        placeholder="Tìm danh bộ, tên..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="px-3 py-1.5 border border-gray-400 rounded-md text-sm font-medium text-gray-900 focus:ring-blue-500 focus:border-blue-500 min-w-[250px] shadow-sm"
                    />
                    {filteredClassification && (
                        <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Đang lọc: {filteredClassification}
                        </span>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 border-b border-gray-300 text-sm">
                    <thead className="bg-gray-200 text-gray-900">
                        <tr className="divide-x divide-gray-300">
                            <th style={{ width: columnWidths.danhBa, maxWidth: columnWidths.danhBa }} className="px-4 py-3 text-left font-bold text-gray-800 sticky left-0 bg-gray-200 z-10 relative group border-b border-gray-300">
                                Danh Bộ <Resizer colKey="danhBa" />
                            </th>
                            <th style={{ width: columnWidths.khachHang, maxWidth: columnWidths.khachHang }} className="px-4 py-3 text-left font-bold text-gray-800 relative group border-b border-gray-300">
                                Khách Hàng <Resizer colKey="khachHang" />
                            </th>
                            <th style={{ width: columnWidths.diaChi, maxWidth: columnWidths.diaChi }} className="px-4 py-3 text-left font-bold text-gray-800 relative group border-b border-gray-300">
                                Địa Chỉ <Resizer colKey="diaChi" />
                            </th>
                            <th style={{ width: columnWidths.dot }} className="px-4 py-3 text-center font-bold text-gray-800 relative group border-b border-gray-300">
                                Đợt <Resizer colKey="dot" />
                            </th>
                            <th style={{ width: columnWidths.mlt }} className="px-4 py-3 text-center font-bold text-gray-800 relative group border-b border-gray-300">
                                MLT <Resizer colKey="mlt" />
                            </th>
                            <th style={{ width: columnWidths.tongNo }} className="px-4 py-3 text-right font-bold text-gray-800 relative group border-b border-gray-300">
                                Tổng Nợ <Resizer colKey="tongNo" />
                            </th>
                            <th style={{ width: columnWidths.tyLe }} className="px-4 py-3 text-center font-bold text-gray-800 relative group border-b border-gray-300">
                                Tỷ Lệ <Resizer colKey="tyLe" />
                            </th>
                            {/* Dynamic Period Columns - Fixed width for now 120px */}
                            {periods.map(p => (
                                <th key={p} className="px-4 py-3 text-center font-bold text-gray-800 whitespace-nowrap border-b border-gray-300">
                                    Kỳ {p}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-300">
                        {paginatedData.map((row) => (
                            <tr key={row.DANHBA} className="hover:bg-blue-50 transition-colors divide-x divide-gray-300">
                                <td className="px-4 py-3 font-mono font-bold text-blue-700 sticky left-0 bg-white z-10 border-r border-gray-300 group-hover:bg-blue-50">
                                    {row.DANHBA}
                                </td>
                                <td className="px-4 py-3 text-gray-900 font-medium">
                                    {row.TENKH}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-sm truncate" title={row.DIACHI}>
                                    {row.DIACHI}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500">
                                    {row.DOT}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500 font-mono text-sm">
                                    {row.MLT}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                                    {formatMoney(row.TONGCONG_BD)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-sm font-bold ${row.ON_TIME_RATE >= 80 ? 'bg-green-100 text-green-700' :
                                        row.ON_TIME_RATE >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        {row.ON_TIME_RATE}%
                                    </span>
                                </td>
                                {/* Dynamic Period Cells */}
                                {periods.map(p => {
                                    const status = row.PAYMENT_STATUS_BY_PERIOD[p] || '-'

                                    // Parse status to check conditions
                                    let cellColor = 'text-gray-500' // Default gray (for non-dates or generic text)
                                    const isDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.test(status)

                                    if (status === 'Chưa thanh toán') {
                                        cellColor = 'text-red-500 font-bold'
                                    } else if (isDate) {
                                        // It's a date "DD/MM/YYYY". Check if paid exactly in this period (MM/YYYY)
                                        // P is "MM/YYYY" (Bill Period)
                                        const [dStr, mStr, yStr] = status.split('/')
                                        const [billM, billY] = p.split('/').map(Number)

                                        const payM = parseInt(mStr, 10)
                                        const payY = parseInt(yStr, 10)

                                        // Backend logic: "Đúng hạn" if PayMonth == BillMonth && PayYear == BillYear
                                        if (payM === billM && payY === billY) {
                                            cellColor = 'text-blue-600 font-medium'
                                        } else {
                                            cellColor = 'text-orange-500'
                                        }
                                    } else {
                                        // Fallback for string status like "Đúng hạn", "Trễ hạn" if backend sends them directly
                                        cellColor = getStatusColor(status)
                                    }

                                    return (
                                        <td key={p} className={`px-4 py-3 text-center whitespace-nowrap text-sm ${cellColor}`}>
                                            {status}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}

                        {paginatedData.length === 0 && (
                            <tr>
                                <td colSpan={7 + periods.length} className="px-6 py-12 text-center text-gray-400">
                                    Không tìm thấy dữ liệu phù hợp.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                        Trước
                    </button>
                    <span className="text-sm text-gray-600">
                        Trang {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    )
}
