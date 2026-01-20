'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { getDashboardData, getComparisonData } from '@/app/actions/dashboard'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0, 
    monthlyConsumption: 0,
    monthlyConsumptionPrev: 0,
    yearlyConsumption: 0,
    zeroConsumptionCount: 0,
    yearlyRevenue: 0,
    yearlyRevenuePrev: 0,
    yearlyCollected: 0,
    yearlyOutstanding: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])
  
  // Filters
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch KPI Data (Server Action)
      const kpiData = await getDashboardData(selectedMonth, selectedYear, selectedYear)
      
      setStats({
        totalCustomers: Number(kpiData.TongDHN_Current) || 0,
        activeCustomers: Number(kpiData.TongDHN_Current) || 0, 
        monthlyConsumption: Number(kpiData.SanLuong_Current) || 0,
        monthlyConsumptionPrev: Number(kpiData.SanLuong_Prev) || 0,
        yearlyConsumption: Number(kpiData.SanLuong_Year) || 0,
        zeroConsumptionCount: Number(kpiData.DHN_BangKhong_Current) || 0,
        yearlyRevenue: Number(kpiData.DoanhThu) || 0,
        yearlyRevenuePrev: Number(kpiData.DoanhThu_Prev) || 0,
        yearlyCollected: Number(kpiData.ThucThu) || 0,
        yearlyOutstanding: (Number(kpiData.DoanhThu) || 0) - (Number(kpiData.ThucThu) || 0)
      })

      // 2. Fetch Chart Comparison Data (Current Year vs Prev Year)
      const prevYear = selectedYear - 1
      const { revenueData, collectionData } = await getComparisonData(selectedYear, prevYear)
      
      // Process Data for Recharts
      const months = Array.from({ length: 12 }, (_, i) => i + 1)
      const processed = months.map(m => {
        const revCurr = revenueData.find((d: any) => d.Ky == m && d.Nam == selectedYear)
        const colCurr = collectionData.find((d: any) => d.Ky == m && d.Nam == selectedYear)
        
        return {
          name: `T${m}`,
          DoanhThu: Number(revCurr?.DoanhThu) || 0,
          ThucThu: Number(colCurr?.ThucThu) || 0,
          TonThu: (Number(revCurr?.DoanhThu) || 0) - (Number(colCurr?.ThucThu) || 0)
        }
      })

      setChartData(processed)

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val)
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Tổng quan</h1>
            <p className="mt-1 text-sm text-gray-500">
              Số liệu thống kê Kỳ {selectedMonth}/{selectedYear}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
               <select 
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(Number(e.target.value))}
                 className="block w-32 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
               >
                 {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                   <option key={m} value={m}>Tháng {m}</option>
                 ))}
               </select>
             </div>
             
             <div className="relative">
               <select
                 value={selectedYear}
                 onChange={(e) => setSelectedYear(Number(e.target.value))}
                 className="block w-32 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
               >
                 {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                   <option key={y} value={y}>Năm {y}</option>
                 ))}
               </select>
             </div>
             
             <button 
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
             >
               Làm mới
             </button>
          </div>
        </div>

        {/* 1. KHỐI ĐỌC SỐ (KPI SẢN LƯỢNG) */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              ✍️ Đọc số (Kỳ {selectedMonth}/{selectedYear})
            </h3>
            
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
               {/* Tổng ĐHN */}
               <div className="bg-blue-50 rounded-lg p-4">
                 <dt className="text-sm font-medium text-gray-500 truncate">Tổng ĐHN</dt>
                 <dd className="mt-1 text-3xl font-semibold text-blue-600">
                    {formatNumber(stats.totalCustomers)}
                 </dd>
                 <p className="text-xs text-blue-400 mt-1">Đồng hồ nước hoạt động: {stats.activeCustomers}</p>
               </div>
               
               {/* Sản lượng Tháng */}
               <div className="bg-blue-50 rounded-lg p-4">
                 <dt className="text-sm font-medium text-gray-500 truncate">Sản lượng (Tháng)</dt>
                 <dd className="mt-1 flex items-baseline justify-between">
                    <span className="text-3xl font-semibold text-blue-600">{formatNumber(stats.monthlyConsumption)}</span>
                    <span className={`text-sm font-medium ${stats.monthlyConsumption >= stats.monthlyConsumptionPrev ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.monthlyConsumption >= stats.monthlyConsumptionPrev ? '▲' : '▼'} 
                      {formatNumber(Math.abs(stats.monthlyConsumption - stats.monthlyConsumptionPrev))} m³
                    </span>
                 </dd>
               </div>

               {/* Sản lượng Năm */}
               <div className="bg-blue-50 rounded-lg p-4">
                 <dt className="text-sm font-medium text-gray-500 truncate">Sản lượng (Năm {selectedYear})</dt>
                 <dd className="mt-1 text-3xl font-semibold text-blue-600">
                    {formatNumber(stats.yearlyConsumption)}
                 </dd>
               </div>

               {/* ĐHN = 0 */}
               <div className="bg-blue-50 rounded-lg p-4">
                 <dt className="text-sm font-medium text-gray-500 truncate">ĐHN = 0 (Tháng)</dt>
                 <dd className="mt-1 text-3xl font-semibold text-blue-600">
                    {formatNumber(stats.zeroConsumptionCount)}
                 </dd>
               </div>
            </div>
          </div>
        </div>

        {/* 2. KHỐI THU TIỀN (KPI DOANH THU) */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              📊 Thu tiền (Năm {selectedYear})
            </h3>
            
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
               {/* Doanh thu */}
               <div className="rounded-lg p-4 border border-gray-200">
                 <dt className="text-sm font-medium text-gray-500 truncate">Doanh thu</dt>
                 <dd className="mt-1 text-2xl font-bold text-green-600">
                    {formatCurrency(stats.yearlyRevenue)}
                 </dd>
                 {stats.yearlyRevenuePrev > 0 && (
                   <p className="text-xs text-gray-500 mt-1">
                     So với năm trước: {stats.yearlyRevenue >= stats.yearlyRevenuePrev ? '+' : ''}
                     {(((stats.yearlyRevenue - stats.yearlyRevenuePrev) / stats.yearlyRevenuePrev) * 100).toFixed(1)}%
                   </p>
                 )}
               </div>

               {/* Thực thu */}
               <div className="rounded-lg p-4 border border-gray-200">
                 <dt className="text-sm font-medium text-gray-500 truncate">Thực thu</dt>
                 <dd className="mt-1 text-2xl font-bold text-green-600">
                    {formatCurrency(stats.yearlyCollected)}
                 </dd>
               </div>

               {/* Tồn thu */}
               <div className="rounded-lg p-4 border border-gray-200">
                 <dt className="text-sm font-medium text-gray-500 truncate">Tồn thu</dt>
                 <dd className="mt-1 text-2xl font-bold text-red-500">
                    {formatCurrency(stats.yearlyOutstanding)}
                 </dd>
               </div>

               {/* % Đạt */}
               <div className="rounded-lg p-4 border border-gray-200">
                 <dt className="text-sm font-medium text-gray-500 truncate">% Đạt</dt>
                 <dd className="mt-1 text-2xl font-bold text-blue-600">
                    {stats.yearlyRevenue > 0 ? ((stats.yearlyCollected / stats.yearlyRevenue) * 100).toFixed(2) : 0}%
                 </dd>
                 <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${stats.yearlyRevenue > 0 ? Math.min((stats.yearlyCollected / stats.yearlyRevenue) * 100, 100) : 0}%` }}
                    ></div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* 3. BIỂU ĐỒ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Biểu đồ Doanh thu & Thực thu */}
           <div className="bg-white shadow rounded-lg p-6">
             <h3 className="text-lg font-medium text-gray-900 mb-4">Biểu đồ Doanh thu (Năm {selectedYear})</h3>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="name" />
                   <YAxis />
                   <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                   <Legend />
                   <Line type="monotone" dataKey="DoanhThu" stroke="#FF5733" name="Doanh Thu" strokeWidth={2} />
                   <Line type="monotone" dataKey="ThucThu" stroke="#33CFFF" name="Thực Thu" strokeWidth={2} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Biểu đồ Tỷ lệ thu */}
           <div className="bg-white shadow rounded-lg p-6">
             <h3 className="text-lg font-medium text-gray-900 mb-4">Tỷ lệ Thực thu theo tháng</h3>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="name" />
                   <YAxis unit="%" />
                   <Tooltip formatter={(value: any) => `${(Number(value) || 0).toFixed(1)}%`} />
                   <Legend />
                   <Bar dataKey="ThucThu" fill="#82ca9d" name="Thực Thu" stackId="a" />
                   <Bar dataKey="TonThu" fill="#ff4b4b" name="Tồn Thu" stackId="a" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>

      </main>
    </div>
  )
}
