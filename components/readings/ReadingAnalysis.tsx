'use client'

import { useState, useEffect } from 'react'
import { getReadingFilters, getReadingChartData, getReadingData, ReadingFilters } from '@/app/readings/actions'
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57']

export default function ReadingAnalysis() {
    // Independent state for analysis
    const now = new Date()
    const [ky, setKy] = useState<number>(now.getMonth() + 1)
    const [nam, setNam] = useState<number>(now.getFullYear())
    const [selectedTo, setSelectedTo] = useState<string>("Tất cả")
    const toOptions = [1, 2, 3, 4]

    // Detail State
    const [selectedMayDetail, setSelectedMayDetail] = useState<string | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [detailedReadings, setDetailedReadings] = useState<any[]>([])
    const [detailPage, setDetailPage] = useState(0)
    const DETAIL_LIMIT = 200

    // Data
    const [loading, setLoading] = useState(false)
    const [chartDataTo, setChartDataTo] = useState<any[]>([])
    const [chartDataDot, setChartDataDot] = useState<any[]>([])
    const [hasAnalyzed, setHasAnalyzed] = useState(false)
    
    // Calculate totals for analysis text
    const totalToCount = chartDataTo.reduce((acc, item) => acc + item.count, 0)
    const totalToConsumption = chartDataTo.reduce((acc, item) => acc + item.consumption, 0)

    const handleAnalyze = async () => {
        setLoading(true)
        setHasAnalyzed(true)
        setSelectedMayDetail(null) 
        setDetailedReadings([])

        try {
            const filters: ReadingFilters = {
                ky_from: ky,
                nam_from: nam,
                to: selectedTo === "Tất cả" ? undefined : Number(selectedTo)
            }

            // Fetch concurrently
            const [toData, dotData] = await Promise.all([
                getReadingChartData(filters, 'To'),
                getReadingChartData(filters, 'dot_consumption')
            ])
            
            // 1. Process To/May Data
            let processedTo: any[] = []
            
            // Staff mapping from old app (phan_tich_to_may.py)
            const staffMap: Record<number, string> = {
                // Tổ 1
                11: "Lê Trung Quốc", 12: "Vũ Hoàng Quốc Việt", 13: "Lê Hồng Tuấn", 14: "Bùi Xuân Hoàng",
                15: "Lương Văn Hùng", 16: "Huỳnh Kim Luân", 17: "Trần Hiệp Hòa", 18: "Nguyễn Thanh Hải",
                // Tổ 2
                21: "Trần Văn Đức", 22: "Võ Viết Trang", 23: "Trần Quang Phương", 24: "Trầm Tấn Hùng",
                25: "Phạm Văn Có", 26: "Lê Tuân", 27: "Lê Tuấn Kiệt", 28: "Phùng Trung Tín",
                // Tổ 3
                31: "Võ Trọng Sĩ", 32: "Phạm Văn Mai", 33: "Đỗ Lê Anh Tú", 34: "Nguyễn Vĩnh Bảo Kh",
                35: "Nguyễn Việt Toàn Nhân", 36: "Trương Trọng Nhân", 37: "Đặng Anh Phương",
                // Tổ 4
                41: "Trần Quốc Tuấn", 42: "Vũ Hoàng", 43: "Dương Quốc Thông", 44: "Huỳnh Ngọc Binh",
                45: "Hoàng Anh Vũ", 46: "Phan Thành Tín", 47: "Nguyễn Tấn Lợi"
            }

            // Always map by Machine (May), even if "All" is selected, to match Legacy App
            processedTo = toData.map((item: any) => {
                const totalRevenue = item.TotalRevenue || 0
                const collectedRevenue = item.CollectedRevenue || 0 
                const percent = totalRevenue > 0 ? (collectedRevenue / totalRevenue) * 100 : 0
                
                // Use staffMap (priority) or fallback to DB data
                let displayName = staffMap[item.May] || item.StaffName || "Không xác định"

                return {
                    name: `${item.May}`,
                    originalName: item.May,
                    staffName: displayName,
                    count: item.RecordCount,
                    consumption: item.TotalConsumption,
                    totalRevenue: totalRevenue,
                    collectedCount: item.CollectedCount || 0,
                    collectedRevenue: collectedRevenue,
                    percent: percent
                }
            })

            // Sort by May (numeric)
            processedTo.sort((a, b) => Number(a.originalName) - Number(b.originalName))

            setChartDataTo(processedTo)

            // 2. Process Dot Data
            const processedDot = dotData
                .map((item: any) => ({
                    name: `Đợt ${item.Dot}`,
                    value: item.TotalConsumption,
                    count: item.DanhBaCount
                }))
            setChartDataDot(processedDot)

        } catch (error) {
            console.error("Analysis failed", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDetails = async (mayVal: string, page: number) => {
        setLoadingDetails(true)
        try {
            const filters: ReadingFilters = {
                ky_from: ky,
                nam_from: nam,
                may: mayVal,
                limit: DETAIL_LIMIT,
                offset: page * DETAIL_LIMIT,
                debtOnly: true // Show only debt
            }
            // Request specific columns for Detail View
            const columns = ["DanhBa", "SoNhaMoi", "Duong", "TenKH", "GB", "Ky", "Nam", "Dot", "TongTien"]
            const data = await getReadingData(filters, columns)
            setDetailedReadings(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Failed to load details", error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleViewDetails = async (mayVal: string) => {
        if (selectedMayDetail === mayVal) {
            setSelectedMayDetail(null)
            setDetailedReadings([])
            return
        }
        
        setSelectedMayDetail(mayVal)
        setDetailPage(0)
        await fetchDetails(mayVal, 0)
    }

    const handlePageChange = async (newPage: number) => {
        if (newPage < 0) return
        setDetailPage(newPage)
        if (selectedMayDetail) {
             await fetchDetails(selectedMayDetail, newPage)
        }
    }

    const handleExportExcel = async () => {
        if (!selectedMayDetail) return
        
        setLoadingDetails(true)
        try {
             // Fetch ALL (limit big number)
             const filters: ReadingFilters = {
                ky_from: ky,
                nam_from: nam,
                may: selectedMayDetail,
                limit: 10000, // Export limit
                offset: 0,
                debtOnly: true // Export only debt
            }
            const columns = ["DanhBa", "SoNhaMoi", "Duong", "TenKH", "GB", "Ky", "Nam", "Dot", "TongTien"]
            const allData = await getReadingData(filters, columns)

            if (allData.length === 0) {
                 alert("Không có dữ liệu công nợ để xuất!")
                 return
            }

            // Format data for Excel
            const dataToExport = allData.map(item => ({
                "DANH BỘ": item.DanhBa,
                "SỐ NHÀ": item.SoNhaMoi,
                "ĐƯỜNG": item.Duong,
                "TÊN KHÁCH HÀNG": item.TenKH,
                "GB": item.GB,
                "KỲ": item.Ky,
                "NĂM": item.Nam,
                "ĐỢT": item.Dot,
                "TỔNG CỘNG": item.TongTien
            }))

            const worksheet = XLSX.utils.json_to_sheet(dataToExport)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "ChiTietMay")
            
            // Buffer
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
            
            saveAs(data, `PhanTich_To${selectedTo}_May${selectedMayDetail}_Ky${ky}_${nam}.xlsx`)

        } catch (e) {
            console.error("Export failed", e)
            alert("Lỗi xuất Excel")
        } finally {
            setLoadingDetails(false)
        }
        
    }

    const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val)
    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Filter Section (High Contrast) */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-500 shadow-lg">
                <h3 className="font-black text-blue-900 border-b-2 border-gray-200 pb-2 mb-4 text-xl flex items-center gap-2">
                    🏭 Phân Tích Theo Tổ
                </h3>
                
                <div className="flex flex-wrap items-end gap-6">
                    <div>
                        <label className="block text-xs font-bold text-black mb-1.5 uppercase">Kỳ</label>
                        <input 
                            type="number" 
                            min="1" max="12"
                            value={ky} 
                            onChange={(e) => setKy(Number(e.target.value))}
                            className="w-24 border-2 border-gray-600 rounded-lg px-3 py-2 text-lg font-bold text-black text-center focus:ring-2 focus:ring-blue-600"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-black mb-1.5 uppercase">Năm</label>
                        <input 
                            type="number" 
                            min="2020" max="2030"
                            value={nam} 
                            onChange={(e) => setNam(Number(e.target.value))}
                            className="w-32 border-2 border-gray-600 rounded-lg px-3 py-2 text-lg font-bold text-black text-center focus:ring-2 focus:ring-blue-600" 
                        />
                    </div>
                    <div className="min-w-[150px]">
                        <label className="block text-xs font-bold text-black mb-1.5 uppercase">Chọn Tổ</label>
                        <select 
                            value={selectedTo}
                            onChange={(e) => setSelectedTo(e.target.value)}
                            className="w-full border-2 border-gray-600 rounded-lg px-3 py-2 text-lg font-bold text-black focus:ring-2 focus:ring-blue-600"
                        >
                            <option value="Tất cả">Tất cả các Tổ</option>
                            {toOptions.map(d => <option key={d} value={d}>Tổ {d}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-800 hover:bg-blue-900 text-white font-extrabold text-sm uppercase rounded-lg shadow-md transition-transform active:scale-95 border-b-4 border-blue-950 flex items-center gap-2 mb-[1px]"
                    >
                        {loading ? '⏳ Đang Chạy...' : '📊 Chạy Phân Tích'}
                    </button>
                </div>
            </div>

            {hasAnalyzed && (
                <div className="space-y-8">
                    
                    {/* Table Section - List of Machines/Groups */}
                    <div className="bg-white p-6 rounded-xl border-2 border-gray-300 shadow-sm overflow-hidden flex flex-col">
                         <h4 className="font-bold text-black text-lg mb-4 flex items-center justify-between">
                             <span>📋 Kết quả Phân tích - {selectedTo === 'Tất cả' ? 'Tất cả các Tổ' : `Tổ ${selectedTo}`} - Kỳ {ky}/{nam}</span>
                             <span className="text-sm font-normal text-gray-500 italic">(Chọn ô để xem chi tiết HĐ nợ)</span>
                         </h4>
                         <div className="overflow-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-100 uppercase text-xs font-bold text-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-300 w-10 text-center">Xem</th>
                                        <th className="px-4 py-3 border-b border-gray-300">Máy</th>
                                        <th className="px-4 py-3 border-b border-gray-300">Tên Nhân Viên</th>
                                        <th className="px-4 py-3 border-b border-gray-300 text-right">SL Bản Ghi</th>
                                        <th className="px-4 py-3 border-b border-gray-300 text-right">Tổng Phát Sinh</th>
                                        <th className="px-4 py-3 border-b border-gray-300 text-right">SL Thu Được</th>
                                        <th className="px-4 py-3 border-b border-gray-300 text-right">Thực Thu</th>
                                        <th className="px-4 py-3 border-b border-gray-300 w-48">% Đạt</th>
                                        <th className="px-4 py-3 border-b border-gray-300 text-right">Sản Lượng (m3)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {chartDataTo.length > 0 ? (
                                        chartDataTo.map((row, idx) => (
                                            <tr key={idx} className={`hover:bg-blue-50 transition-colors ${selectedMayDetail === row.originalName ? 'bg-blue-100' : 'bg-white'}`}>
                                                <td className="px-4 py-3 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedMayDetail === String(row.originalName)}
                                                        onChange={() => handleViewDetails(String(row.originalName))}
                                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" 
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-900">{row.originalName}</td>
                                                <td className="px-4 py-3 text-gray-600">{row.staffName}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatNumber(row.count)}</td>
                                                
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(row.totalRevenue).replace('₫', '')}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatNumber(row.collectedCount)}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(row.collectedRevenue).replace('₫', '')}</td>
                                                <td className="px-4 py-3 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden border border-gray-300">
                                                            <div 
                                                                className="bg-red-500 h-2.5 rounded-full" 
                                                                style={{ width: `${Math.min(row.percent, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-700 w-10 text-right">{row.percent.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatNumber(row.consumption)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500 italic">Không có dữ liệu</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                    </div>

                    {/* DETAIL SECTION: Shown when a May is selected */}
                    {selectedMayDetail && (
                        <div className="bg-white p-6 rounded-xl border-2 border-blue-500 shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
                            <h4 className="font-bold text-blue-900 text-lg mb-4 flex items-center justify-between border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <span>📄 Chi Tiết Hóa Đơn - Máy {selectedMayDetail}</span>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Trang {detailPage + 1}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleExportExcel}
                                        disabled={loadingDetails || detailedReadings.length === 0}
                                        className="text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50 flex items-center gap-1"
                                    >
                                        📊 Xuất Excel (Tất cả)
                                    </button>
                                    <button onClick={() => setSelectedMayDetail(null)} className="text-sm text-red-500 hover:text-red-700 font-bold">✕ Đóng</button>
                                </div>
                            </h4>
                            
                            {loadingDetails ? (
                                <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                                    <span className="text-2xl mb-2">⏳</span>
                                    <span>Đang tải dữ liệu trang {detailPage + 1}...</span>
                                </div>
                            ) : (
                                <div className="overflow-auto max-h-[500px] flex flex-col">
                                    <table className="w-full text-sm text-left border-collapse border border-gray-300 mb-4">
                                        <thead className="bg-gray-800 uppercase text-xs font-bold text-white sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 border border-gray-600">DANHBA</th>
                                                <th className="px-4 py-3 border border-gray-600">SO</th>
                                                <th className="px-4 py-3 border border-gray-600">DUONG</th>
                                                <th className="px-4 py-3 border border-gray-600">TENKH</th>
                                                <th className="px-4 py-3 border border-gray-600 text-center">GB</th>
                                                <th className="px-4 py-3 border border-gray-600 text-center">KY</th>
                                                <th className="px-4 py-3 border border-gray-600 text-center">NAM</th>
                                                <th className="px-4 py-3 border border-gray-600 text-center">DOT</th>
                                                <th className="px-4 py-3 border border-gray-600 text-right">TONGCONG</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700 bg-[#0f1016] text-gray-300">
                                            {detailedReadings.length > 0 ? (
                                                detailedReadings.map((reading, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-800 transition-colors">
                                                        <td className="px-4 py-2 border border-gray-700 font-mono text-white">{reading.DanhBa}</td>
                                                        <td className="px-4 py-2 border border-gray-700">{reading.SoNhaMoi}</td>
                                                        <td className="px-4 py-2 border border-gray-700">{reading.Duong}</td>
                                                        <td className="px-4 py-2 border border-gray-700 text-white font-medium">{reading.TenKH}</td>
                                                        <td className="px-4 py-2 border border-gray-700 text-center">{reading.GB}</td>
                                                        <td className="px-4 py-2 border border-gray-700 text-center">{reading.Ky}</td>
                                                        <td className="px-4 py-2 border border-gray-700 text-center">{reading.Nam}</td>
                                                        <td className="px-4 py-2 border border-gray-700 text-center">{reading.Dot}</td>
                                                        <td className="px-4 py-2 border border-gray-700 text-right font-bold text-white">{formatNumber(reading.TongTien)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 italic">Không tìm thấy bản ghi chi tiết</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {detailedReadings.length > 0 && (
                                            <tfoot className="bg-gray-800 font-bold sticky bottom-0 z-10 text-white border-t border-gray-600">
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-3 text-right">TỔNG CỘNG ({detailedReadings.length} bản ghi)</td>
                                                    <td className="px-4 py-3 text-right text-green-400">{formatCurrency(detailedReadings.reduce((s, r) => s + (r.TongTien || 0), 0)).replace('₫', '')}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>

                                    {/* Pagination Controls */}
                                    <div className="flex justify-center items-center gap-4 mt-2 mb-2">
                                        <button 
                                            onClick={() => handlePageChange(detailPage - 1)}
                                            disabled={detailPage === 0 || loadingDetails}
                                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-black font-bold disabled:opacity-50"
                                        >
                                            ⬅ Trang Trước
                                        </button>
                                        <span className="font-bold text-black">Trang {detailPage + 1}</span>
                                        <button 
                                            onClick={() => handlePageChange(detailPage + 1)}
                                            disabled={detailedReadings.length < DETAIL_LIMIT || loadingDetails} 
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold disabled:opacity-50"
                                        >
                                            Trang Tiếp ➡
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                     {/* Second Row: Detailed Chart (Optional but helpful) */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         {/* ... (Charts kept same, just lighter theme container if needed or keep standard) */}
                         <div className="bg-white p-6 rounded-xl border-2 border-gray-400 shadow-sm">
                            <h4 className="font-bold text-black text-lg mb-4 flex items-center justify-between">
                                <span>📊 Số Lượng Đồng Hồ Theo {selectedTo === 'Tất cả' ? 'Tổ' : 'Máy'}</span>
                                <span className="text-sm font-normal text-gray-500 italic">Tổng: {formatNumber(totalToCount)} đồng hồ</span>
                            </h4>
                            <div className="h-[300px] w-full">
                                {chartDataTo.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartDataTo} margin={{ top: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis 
                                                dataKey="name" 
                                                tick={{fontSize: 11, fontWeight: 'bold'}} 
                                                angle={-45} 
                                                textAnchor="end" 
                                                height={60} 
                                            />
                                            <YAxis yAxisId="left" />
                                            <YAxis yAxisId="right" orientation="right" unit="%" stroke="#ff0000" />
                                            <Tooltip 
                                                formatter={(value, name) => {
                                                    if (name === 'Tỉ lệ Thực Thu') return `${Number(value).toFixed(1)}%`
                                                    return [new Intl.NumberFormat('vi-VN').format(Number(value)), "Đồng hồ"]
                                                }}
                                                cursor={{fill: '#f3f4f6'}}
                                                labelStyle={{fontWeight: 'bold', color: 'black'}}
                                            />
                                            <Legend />
                                            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số lượng">
                                                {chartDataTo.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> )}
                                            </Bar>
                                            <Line 
                                                yAxisId="right" 
                                                type="monotone" 
                                                dataKey="percent" 
                                                name="Tỉ lệ Thực Thu" 
                                                stroke="#ff0000" 
                                                strokeWidth={3}
                                                dot={{r: 4, stroke: '#fff', strokeWidth: 2}}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : <div className="h-full flex items-center justify-center text-gray-400 italic">Không có dữ liệu</div>}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border-2 border-gray-400 shadow-sm">
                            <h4 className="font-bold text-black text-lg mb-4 flex items-center justify-between">
                                <span>🌊 Sản Lượng Theo Đợt</span>
                            </h4>
                            <div className="h-[300px] w-full">
                                {chartDataDot.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartDataDot} margin={{ top: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 'bold'}} />
                                            <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)} />
                                            <Tooltip formatter={(val: any) => [formatNumber(Number(val)) + ' m3', "Sản Lượng"]} cursor={{fill: '#f3f4f6'}} labelStyle={{fontWeight: 'bold', color: 'black'}} />
                                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Sản lượng">
                                                <Cell fill="#10b981" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div className="h-full flex items-center justify-center text-gray-400 italic">Không có dữ liệu tiêu thụ</div>}
                            </div>
                        </div>
                     </div>
                </div>
            )}

            {!hasAnalyzed && (
                 <div className="bg-gray-50 border-4 border-dashed border-gray-300 rounded-xl h-64 flex flex-col items-center justify-center text-gray-400">
                    <span className="text-6xl mb-4 opacity-50">🏭</span>
                    <p className="font-bold text-lg text-gray-500">Chọn Kỳ - Năm và bấm "Chạy Phân Tích"</p>
                </div>
            )}
        </div>
    )
}
