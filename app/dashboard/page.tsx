'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'

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
    fetchDashboardData()
  }, [selectedYear, selectedMonth])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Customer Stats
      const { count: totalCustomers } = await supabase.from('customers').select('*', { count: 'exact', head: true })
      const { count: activeCustomers } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active')

      // 2. Fetch Consumption Stats (from Invoices)
      // This month
      const { data: mnInvoices } = await supabase.from('invoices')
        .select('consumption')
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
      
      const consumptionMonth = mnInvoices?.reduce((sum, inv) => sum + (inv.consumption || 0), 0) || 0

      // Last month (for delta)
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
      
      const { data: prevMnInvoices } = await supabase.from('invoices')
        .select('consumption')
        .eq('period_month', prevMonth)
        .eq('period_year', prevYear)
        
      const consumptionMonthPrev = prevMnInvoices?.reduce((sum, inv) => sum + (inv.consumption || 0), 0) || 0

      // Year Consumption
      const { data: yrInvoices } = await supabase.from('invoices')
         .select('consumption')
         .eq('period_year', selectedYear)
      
      const consumptionYear = yrInvoices?.reduce((sum, inv) => sum + (inv.consumption || 0), 0) || 0

      // Zero Consumption Count
      const zeroCount = mnInvoices?.filter(inv => inv.consumption === 0).length || 0

      // 3. Fetch Revenue Stats (from monthly_revenue view)
      const { data: revData } = await supabase.from('monthly_revenue')
        .select('*')
        .eq('period_year', selectedYear)
      
      const revenueYear = revData?.reduce((sum, r) => sum + (r.total_revenue || 0), 0) || 0
      const collectedYear = revData?.reduce((sum, r) => sum + (r.collected_revenue || 0), 0) || 0
      const outstandingYear = revData?.reduce((sum, r) => sum + (r.outstanding_revenue || 0), 0) || 0

      // Previous Year Revenue
      const { data: revDataPrev } = await supabase.from('monthly_revenue')
        .select('total_revenue')
        .eq('period_year', selectedYear - 1)
      const revenueYearPrev = revDataPrev?.reduce((sum, r) => sum + (r.total_revenue || 0), 0) || 0

      setStats({
        totalCustomers: totalCustomers || 0,
        activeCustomers: activeCustomers || 0,
        monthlyConsumption: consumptionMonth,
        monthlyConsumptionPrev: consumptionMonthPrev,
        yearlyConsumption: consumptionYear,
        zeroConsumptionCount: zeroCount,
        yearlyRevenue: revenueYear,
        yearlyRevenuePrev: revenueYearPrev,
        yearlyCollected: collectedYear,
        yearlyOutstanding: outstandingYear
      })

      // 4. Prepare Chart Data
      // Combine current year and previous year data
      const chartPoints = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1
        const curr = revData?.find(r => r.period_month === month)
        // Note: We might need to fetch prev year monthly data separately for detailed chart
        return {
          name: `T${month}`,
          DoanhThu: curr?.total_revenue || 0,
          ThucThu: curr?.collected_revenue || 0,
          TonThu: curr?.outstanding_revenue || 0
        }
      })
      
      setChartData(chartPoints)

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Filters */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Tổng quan</h1>
            <p className="mt-1 text-sm text-gray-500">
              Số liệu thống kê Kỳ {selectedMonth}/{selectedYear}
            </p>
          </div>
          
          <div className="mt-4 flex gap-4 md:mt-0">
             <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(Number(e.target.value))}
               className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
             >
               {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                 <option key={m} value={m}>Tháng {m}</option>
               ))}
             </select>
             
             <select
               value={selectedYear}
               onChange={(e) => setSelectedYear(Number(e.target.value))}
               className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
             >
               {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                 <option key={y} value={y}>Năm {y}</option>
               ))}
             </select>
             
             <button 
                onClick={fetchDashboardData}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                   <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                   <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
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
