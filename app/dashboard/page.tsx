
'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

import { getDashboardData, getComparisonData, getRevenueByPriceList, getRevenueByDot } from '@/app/actions/dashboard'
import { DashboardKPIData } from '@/app/dashboard/types'
import MetricCard from '@/components/dashboard/MetricCard'
import DashboardFilters from '@/components/dashboard/DashboardFilters'
import YearComparisonSelector from '@/components/dashboard/YearComparisonSelector'
import ChartSection from '@/components/dashboard/ChartSection'

export default function Dashboard() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Filter States
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [comparisonYear, setComparisonYear] = useState(currentYear - 1)
  
  // Data States
  const [stats, setStats] = useState<DashboardKPIData>({
    DoanhThu: 0, ThucThu: 0, DoanhThu_GB: 0, ThucThu_GB: 0,
    DoanhThu_Prev: 0, DoanhThu_GB_Prev: 0,
    TongDHN_Current: 0, SanLuong_Current: 0, SanLuong_Prev: 0,
    SanLuong_Year: 0, SanLuong_Year_Prev: 0, DHN_BangKhong_Current: 0
  })

  // Chart Data States
  const [revenueChartData, setRevenueChartData] = useState<any[]>([])
  const [consumptionChartData, setConsumptionChartData] = useState<any[]>([])
  const [collectionRateChartData, setCollectionRateChartData] = useState<any[]>([])
  const [pieChartData, setPieChartData] = useState<any[]>([])
  const [pieType, setPieType] = useState<'GB' | 'Dot'>('GB')

  // Generate last 5 years for comparison
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth, comparisonYear])

  useEffect(() => {
    fetchPieData()
  }, [selectedYear, pieType])

  const fetchPieData = async () => {
    try {
      let data = []
      if (pieType === 'GB') {
        data = await getRevenueByPriceList(selectedYear)
      } else {
        data = await getRevenueByDot(selectedYear)
      }

      setPieChartData([{
        values: data.map((d: any) => d.DoanhThu),
        labels: data.map((d: any) => pieType === 'GB' ? `GB ${d.GB}` : `Đợt ${d.Dot}`),
        type: 'pie',
        textinfo: 'label+percent',
        insidetextorientation: 'radial',
        hovertemplate: `<b>%{label}</b><br>Doanh thu: %{value:,.0f} VNĐ<br>Tỷ lệ: %{percent}<extra></extra>`
      }])
    } catch (e) {
      console.error("Error fetching pie data", e)
    }
  }

  const fetchData = async () => {
    try {
      // Parallel Fetching
      const [kpiData, { revenueData, collectionData, consumptionData }] = await Promise.all([
         getDashboardData(selectedMonth, selectedYear, selectedYear),
         getComparisonData(selectedYear, comparisonYear)
      ])
      
      // Cast response to typed object
      setStats(kpiData as unknown as DashboardKPIData)

      // Helper to process data for a specific year and handle future months as null
      const processYearData = (year: number, data: any[], valueKey: string) => {
        const result = Array(12).fill(null) // Default to null to break lines
        const isCurrentYear = year === new Date().getFullYear()
        const currentMonth = new Date().getMonth() + 1
        
        data.filter((d: any) => d.Nam === year).forEach((d: any) => {
          if (d.Ky >= 1 && d.Ky <= 12) {
             // Logic: If it's current year, we only show data up to current month
             // If Current Year AND Month > Current Month => Keep NULL (don't show 0)
             if (isCurrentYear && d.Ky > currentMonth) return;

             const val = Number(d[valueKey]) || 0
             // Set value
             result[d.Ky - 1] = val
          }
        })
        
        if (isCurrentYear) {
            for(let i = currentMonth; i < 12; i++) {
                result[i] = null
            }
        }

        return result
      }
      
      const months = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`)

      // --- Prepare Chart Datasets ---
      const revCurrRaw = processYearData(selectedYear, revenueData, 'DoanhThu')
      const revCompRaw = processYearData(comparisonYear, revenueData, 'DoanhThu')
      
      const consCurrRaw = processYearData(selectedYear, consumptionData, 'SanLuong')
      const consCompRaw = processYearData(comparisonYear, consumptionData, 'SanLuong')

      const colCurrRaw = processYearData(selectedYear, collectionData, 'ThucThu')
      const colCompRaw = processYearData(comparisonYear, collectionData, 'ThucThu')

      // Calculate Rates (handle nulls safely)
      const calcRate = (thucThu: (number|null)[], doanhThu: (number|null)[]) => {
        return thucThu.map((tt, i) => {
          const dt = doanhThu[i]
          if (tt === null || dt === null) return null // maintain gap
          return dt > 0 ? (tt / dt) * 100 : 0
        })
      }
      const rateCurr = calcRate(colCurrRaw, revCurrRaw)
      const rateComp = calcRate(colCompRaw, revCompRaw)

      // --- Set Chart State ---
      setRevenueChartData([
        {
          x: months,
          y: revCompRaw.map(v => v !== null ? v / 1_000_000_000 : null),
          customdata: revCompRaw,
          type: 'scatter', mode: 'lines+markers', name: `${comparisonYear}`,
          connectgaps: false, // Don't connect over nulls
          line: { color: '#3b82f6', width: 3 }, marker: { size: 6 },
          hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Doanh thu: %{customdata:,.0f} VNĐ<extra></extra>'
        },
        {
          x: months,
          y: revCurrRaw.map(v => v !== null ? v / 1_000_000_000 : null),
          customdata: revCurrRaw,
          type: 'scatter', mode: 'lines+markers', name: `${selectedYear}`,
          connectgaps: false,
          line: { color: '#ef4444', width: 3 }, marker: { size: 6 },
          hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Doanh thu: %{customdata:,.0f} VNĐ<extra></extra>'
        }
      ])

      setConsumptionChartData([
         {
          x: months,
          y: consCompRaw.map(v => v !== null ? v / 1_000_000 : null),
          customdata: consCompRaw,
          type: 'scatter', mode: 'lines+markers', name: `${comparisonYear}`,
          connectgaps: false,
          line: { color: '#06b6d4', width: 3 }, marker: { size: 6 },
          hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Sản lượng: %{customdata:,.0f} m³<extra></extra>'
        },
        {
          x: months,
          y: consCurrRaw.map(v => v !== null ? v / 1_000_000 : null),
          customdata: consCurrRaw,
          type: 'scatter', mode: 'lines+markers', name: `${selectedYear}`,
          connectgaps: false,
          line: { color: '#f97316', width: 3 }, marker: { size: 6 },
          hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Sản lượng: %{customdata:,.0f} m³<extra></extra>'
        }
      ])

      setCollectionRateChartData([
        {
           x: months,
           y: rateComp,
           customdata: colCompRaw,
           type: 'bar', name: `${comparisonYear}`,
           marker: { color: '#3b82f6' },
           text: rateComp.map(v => v !== null ? v.toFixed(1) + '%' : ''), textposition: 'auto',
           hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Tỷ lệ: %{y:.2f}%<br>Thực thu: %{customdata:,.0f} VNĐ<extra></extra>'
        },
        {
           x: months,
           y: rateCurr,
           customdata: colCurrRaw,
           type: 'bar', name: `${selectedYear}`,
           marker: { color: '#ef4444' },
           text: rateCurr.map(v => v !== null ? v.toFixed(1) + '%' : ''), textposition: 'auto',
           hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Tỷ lệ: %{y:.2f}%<br>Thực thu: %{customdata:,.0f} VNĐ<extra></extra>'
        }
      ])

    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
  }

  // Derived calculations for Metric Cards
  const yearlyOutstanding = (stats.DoanhThu || 0) - (stats.ThucThu || 0)
  const yearlyOutstandingGB = (stats.DoanhThu_GB || 0) - (stats.ThucThu_GB || 0)
  const completionRateTotal = stats.DoanhThu > 0 ? (stats.ThucThu / stats.DoanhThu) * 100 : 0
  const completionRateGB = stats.DoanhThu_GB > 0 ? (stats.ThucThu_GB / stats.DoanhThu_GB) * 100 : 0

  return (
    <div className="min-h-screen bg-[#F0F4F8] pt-20 font-inter">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Tổng quan tình hình sản xuất & kinh doanh</p>
          </div>
          
          <DashboardFilters 
              selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear} setSelectedYear={setSelectedYear}
              onRefresh={fetchData}
              years={availableYears}
          />
        </div>

        {/* 1. KHỐI SẢN XUẤT */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-bold text-slate-800">Sản Xuất <span className="text-sm font-normal text-slate-500 ml-2">(Tháng {selectedMonth}/{selectedYear})</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <MetricCard 
                title="Tổng ĐHN" 
                value={Number(stats.TongDHN_Current)} 
                gradientColor="cyan"
                iconPath={<svg className="w-24 h-24 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>}
             />
             <MetricCard 
                title="Sản lượng (Tháng)" 
                value={Number(stats.SanLuong_Current)} 
                prevValue={Number(stats.SanLuong_Prev)}
                unit="m³"
                gradientColor="sky"
                iconPath={<svg className="w-24 h-24 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>}
             />
             <MetricCard 
                title="Sản lượng (Năm)" 
                value={Number(stats.SanLuong_Year)} 
                prevValue={Number(stats.SanLuong_Year_Prev)}
                unit="m³"
                gradientColor="blue"
                iconPath={<svg className="w-24 h-24 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>}
             />
             <MetricCard 
                title="ĐHN 0 m³" 
                value={Number(stats.DHN_BangKhong_Current)} 
                gradientColor="orange"
                trendMode='inverse' // Higher is "bad" usually but here just highlighting
                description="High Priority"
                iconPath={<svg className="w-24 h-24 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
             />
          </div>
        </section>

        {/* 2. KHỐI KINH DOANH */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-bold text-slate-800">Kinh Doanh <span className="text-sm font-normal text-slate-500 ml-2">(Năm {selectedYear})</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* KPI Cards for Revenue */}
             {/* Custom Card for DOANH THU (With Avg Price) */}
             <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                 <div className="relative z-10 text-white">
                     <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">Doanh Thu</p>
                     <h3 className="text-2xl font-black mb-2 tracking-tight">
                         {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(stats.DoanhThu))}
                     </h3>
                     
                     {/* Trend / Prev Value */}
                     <div className="flex items-center gap-2 mb-4">
                        <span className={`text-xs px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm font-bold flex items-center gap-1`}>
                            {Number(stats.DoanhThu) >= Number(stats.DoanhThu_Prev) ? '▲' : '▼'} 
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.abs(Number(stats.DoanhThu) - Number(stats.DoanhThu_Prev)))}
                        </span>
                     </div>

                     <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-white/20">
                         {/* Water Money */}
                         <div className="flex justify-between items-center">
                             <span className="text-xs font-medium text-white/90">Tiền nước</span>
                             <span className="text-sm font-bold text-white">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(stats.DoanhThu_GB))}
                             </span>
                         </div>
                         
                         {/* Average Price */}
                         <div className="flex justify-between items-center bg-white/10 rounded px-2 py-1 -mx-2">
                             <span className="text-xs font-medium text-white/90">Giá bán BQ</span>
                             {/* Formula: DoanhThu_GB / SanLuong_Year */}
                             <span className="text-sm font-bold text-yellow-300">
                                {stats.SanLuong_Year > 0 
                                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(stats.DoanhThu_GB) / Number(stats.SanLuong_Year)).replace('₫', '') + ' đ/m³'
                                    : '0,00 đ/m³'}
                             </span>
                         </div>
                     </div>
                 </div>
                 
                 {/* Icon Background */}
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 text-white">
                    <svg className="w-32 h-32 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 </div>
             </div>
             <MetricCard 
                title="Thực thu"
                value={Number(stats.ThucThu)}
                type='currency'
                gradientColor='emerald'
                subValueLabel='Tiền nước'
                subValue={Number(stats.ThucThu_GB)}
                iconPath={<svg className="w-32 h-32 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
             />
             <MetricCard 
                title="Tồn thu"
                value={yearlyOutstanding}
                type='currency'
                gradientColor='orange' // Amber/Orange
                trendMode='inverse' // High Debt is Bad
                subValueLabel='Tiền nước'
                subValue={yearlyOutstandingGB}
                iconPath={<svg className="w-32 h-32 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
             />

            {/* % Dat - Custom Card Logic (Complexity here warrants keeping custom initially) */}
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 shadow-lg shadow-purple-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
               <div className="relative z-10 w-full text-white">
                 <dt className="text-xs font-bold text-white/80 uppercase tracking-wider mb-4">% Hoàn thành (Thu tiền)</dt>
                 
                 <div className="mb-4">
                   <div className="flex justify-between items-end mb-1">
                     <span className="text-xs font-bold text-white/90">Tổng doanh thu</span>
                     <span className="text-xl font-black text-white">{completionRateTotal.toFixed(2)}%</span>
                   </div>
                   <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
                     <div className="bg-white h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${Math.min(completionRateTotal, 100)}%` }}></div>
                   </div>
                 </div>

                 <div>
                   <div className="flex justify-between items-end mb-1">
                     <span className="text-xs font-bold text-white/90">Tiền nước</span>
                     <span className="text-lg font-black text-white">{completionRateGB.toFixed(2)}%</span>
                   </div>
                   <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
                     <div className="bg-white/80 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${Math.min(completionRateGB, 100)}%` }}></div>
                   </div>
                 </div>
               </div>
               <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 text-white">
                <svg className="w-32 h-32 transform translate-x-6 translate-y-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-6">
           <ChartSection 
              title={
                 <div className="flex items-center justify-between w-full">
                    <span>Doanh thu</span>
                    <YearComparisonSelector 
                        selectedYear={selectedYear} setSelectedYear={setSelectedYear}
                        comparisonYear={comparisonYear} setComparisonYear={setComparisonYear}
                        years={availableYears}
                    />
                 </div>
              }
              chartType="line" 
              data={revenueChartData} 
              layout={{
                yaxis: { tickformat: '.0f', ticksuffix: ' Tỷ' },
                xaxis: { title: 'Tháng', tickmode: 'linear', type: 'category' },
                margin: { t: 40, b: 60, l: 60, r: 20 },
              }}
           />
           <ChartSection 
              title={
                 <div className="flex items-center justify-between w-full">
                    <span>Sản lượng</span>
                    <YearComparisonSelector 
                        selectedYear={selectedYear} setSelectedYear={setSelectedYear}
                        comparisonYear={comparisonYear} setComparisonYear={setComparisonYear}
                        years={availableYears}
                    />
                 </div>
              }
              chartType="line" 
              data={consumptionChartData} 
              layout={{
                 yaxis: { tickformat: '.2f', ticksuffix: ' Triệu' },
                 xaxis: { title: 'Tháng', tickmode: 'linear', type: 'category' },
                 margin: { t: 40, b: 60, l: 80, r: 20 },
              }}
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <ChartSection 
              title={
                 <div className="flex items-center justify-between w-full">
                    <span>Tỷ lệ thực thu (%)</span>
                    <YearComparisonSelector 
                        selectedYear={selectedYear} setSelectedYear={setSelectedYear}
                        comparisonYear={comparisonYear} setComparisonYear={setComparisonYear}
                        years={availableYears}
                    />
                 </div>
              } 
              chartType="bar" 
              data={collectionRateChartData} 
              layout={{
                barmode: 'group',
                yaxis: { tickformat: '.0f', ticksuffix: '%', range: [0, 105] },
                xaxis: { title: 'Tháng', tickmode: 'linear', type: 'category' },
              }}
           />
           
           <ChartSection 
              title="Cơ cấu Doanh thu"
              chartType="pie"
              isPie={true}
              pieViewType={pieType}
              onPieTypeChange={setPieType}
              data={pieChartData}
              layout={{
                 legend: { orientation: 'h', y: -0.1 },
              }}
           />
        </div>

      </main>
    </div>
  )
}
