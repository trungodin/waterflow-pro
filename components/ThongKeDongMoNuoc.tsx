'use client'

import { useState, useEffect } from 'react'
import { getOnOffStatistics, OnOffStatistics } from '../lib/actions/thong-ke-dong-mo'
import VirtualDMNTable from './VirtualDMNTable'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

interface ThongKeDongMoNuocProps {
  formatCurrency: (val: string | number) => string | number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

// Table columns configuration
const LOCKED_TABLE_COLS = [
  { id: 'stt', label: 'STT', width: 50, align: 'center' },
  { id: 'DanhBa', label: 'Danh Bạ', width: 110, align: 'left' },
  { id: 'SoNha', label: 'Số Nhà', width: 100, align: 'left' },
  { id: 'Duong', label: 'Đường', width: 200, align: 'left' },
  { id: 'TenKH', label: 'Tên Khách Hàng', width: 250, align: 'left' },
  { id: 'TongNo', label: 'Tổng Nợ', width: 120, align: 'right' },
  { id: 'KyNam', label: 'Kỳ Năm', width: 100, align: 'left' },
  { id: 'NgayKhoa', label: 'Ngày Khóa', width: 120, align: 'center' },
  { id: 'KieuKhoa', label: 'Kiểu Khóa', width: 120, align: 'left' },
  { id: 'NhomKhoa', label: 'Nhóm Khóa', width: 120, align: 'left' },
]

const OPENED_TABLE_COLS = [
  ...LOCKED_TABLE_COLS,
  { id: 'NgayMo', label: 'Ngày Mở', width: 120, align: 'center' }
]

export default function ThongKeDongMoNuoc({ formatCurrency }: ThongKeDongMoNuocProps) {
  // Input State
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
  
  // Data State
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<OnOffStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Active Tab for Tables
  const [activeTab, setActiveTab] = useState<'locked' | 'opened'>('locked')

  const handleFetchData = async () => {
    setLoading(true)
    setError(null)
    try {
        const res = await getOnOffStatistics(startDate, endDate)
        if (res.success && res.data) {
            setData(res.data)
        } else {
            setError(res.error || 'Lỗi không xác định')
        }
    } catch (err: any) {
        setError(err.message)
    } finally {
        setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    // Only fetch if user explicitly refreshes or on first load? 
    // Let's allow manual only to avoid heavy hits or auto-fetch on mount.
    handleFetchData()
  }, [])

  // Helper for Export Excel (mock logic - reuse from LocDuLieuTon or add new)
  const handleExportExcel = async (type: 'locked' | 'opened') => {
     if (!data) return
     try {
         const XLSX = (await import('xlsx'))
         const rawData = type === 'locked' ? data.tables.lockedData : data.tables.openedData
         
         const mappedData = rawData.map((item, idx) => ({
             STT: idx + 1,
             DANH_BA: item.DanhBa,
             SO_NHA: item.SoNha,
             DUONG: item.Duong,
             TEN_KH: item.TenKH,
             TONG_NO: item.TongNo,
             KY_NAM: item.KyNam,
             NGAY_KHOA: item.NgayKhoa,
             KIEU_KHOA: item.KieuKhoa,
             NHOM_KHOA: item.NhomKhoa,
             ...(type === 'opened' ? { NGAY_MO: item.NgayMo } : {})
         }))

         const ws = XLSX.utils.json_to_sheet(mappedData)
         const wb = XLSX.utils.book_new()
         XLSX.utils.book_append_sheet(wb, ws, "Baocao")
         XLSX.writeFile(wb, `ThongKe_${type}_${startDate}_${endDate}.xlsx`)
     } catch (e: any) {
         alert("Lỗi xuất Excel: " + e.message)
     }
  }


  return (
    <div className='flex flex-col h-full gap-4 animate-in fade-in duration-500 pb-20'>
      
      {/* 1. Controller Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2">
                <span className="text-cyan-600 bg-cyan-50 p-1.5 rounded-lg">📊</span> 
                Thống kê Đóng Mở Nước
            </h3>
        </div>
        
        <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-bold text-gray-700 block mb-1">Từ ngày</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
            <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-bold text-gray-700 block mb-1">Đến ngày</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
            <button 
                onClick={handleFetchData}
                disabled={loading}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 transition-all shadow-sm flex items-center gap-2 h-[42px]"
            >
                {loading ? 'Đang tải...' : '🔄 Làm mới dữ liệu'}
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 font-medium">
            ❌ {error}
        </div>
      )}

      {/* 2. Stats Metrics */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-1">
                <span className="text-gray-500 font-bold text-xs uppercase">💧 Khóa Nước</span>
                <span className="text-2xl font-black text-blue-600">{data.summary.totalLocked.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">danh bạ</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-1">
                <span className="text-gray-500 font-bold text-xs uppercase">🔓 Mở Nước</span>
                <span className="text-2xl font-black text-green-600">{data.summary.totalOpened.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">danh bạ</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-1">
                <span className="text-gray-500 font-bold text-xs uppercase">📅 Thời gian</span>
                <span className="text-2xl font-black text-purple-600">{data.summary.daysCount}</span>
                <span className="text-[10px] text-gray-400">ngày</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-1">
                 <span className="text-gray-500 font-bold text-xs uppercase">📊 Trung bình/ngày</span>
                 <span className="text-2xl font-black text-orange-600">{data.summary.avgPerDay.toFixed(1)}</span>
                 <span className="text-[10px] text-gray-400">hồ sơ</span>
            </div>
        </div>
      )}

      {/* 3. Charts Section */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart: Tình trạng */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h4 className="text-gray-700 font-bold mb-4 text-sm uppercase border-b pb-2">📋 Phân bố theo Tình trạng</h4>
                 <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.charts.statusCounts}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={(props: any) => `${props.name || ''} ${(props.percent ? props.percent * 100 : 0).toFixed(0)}%`}
                          >
                            {data.charts.statusCounts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(val: any) => val.toLocaleString()} />
                          <Legend />
                        </PieChart>
                     </ResponsiveContainer>
                 </div>
            </div>

            {/* Bar Chart: Nhóm khóa */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h4 className="text-gray-700 font-bold mb-4 text-sm uppercase border-b pb-2">📊 Phân bố theo Nhóm Khóa</h4>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data.charts.groupCounts}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                            <RechartsTooltip formatter={(val: any) => val.toLocaleString()} />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                 {data.charts.groupCounts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            </div>
        </div>
      )}

      {/* 4. Detailed Tables */}
      {data && (
         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
             {/* Tabs Header */}
             <div className="flex border-b border-gray-200 bg-gray-50">
                 <button 
                    onClick={() => setActiveTab('locked')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'locked' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                    🔒 Bảng Khóa Nước <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-[10px]">{data.tables.lockedData.length}</span>
                 </button>
                 <button 
                    onClick={() => setActiveTab('opened')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'opened' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                    🔓 Bảng Mở Nước <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-[10px]">{data.tables.openedData.length}</span>
                 </button>
                 
                 <div className="ml-auto p-2">
                     <button
                        onClick={() => handleExportExcel(activeTab)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-bold transition-colors flex items-center gap-1"
                     >
                        📝 Xuất Excel bảng này
                     </button>
                 </div>
             </div>

             {/* Table Content */}
             <div className="flex-1 p-0 overflow-hidden relative">
                 <div className="absolute inset-0">
                    <VirtualDMNTable 
                        data={activeTab === 'locked' ? data.tables.lockedData : data.tables.openedData}
                        searchTerm=""
                        formatCurrency={formatCurrency}
                        isFlatMode={true}
                        customColumns={activeTab === 'locked' ? LOCKED_TABLE_COLS : OPENED_TABLE_COLS}
                    />
                 </div>
             </div>
         </div>
      )}
    </div>
  )
}
