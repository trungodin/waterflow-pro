'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'
import { getDashboardData, getComparisonData, getRevenueByPriceList, getRevenueByDot, getConsumptionByPriceList, getConsumptionByDot, forceRefreshDashboard } from '@/app/actions/dashboard'
import { DashboardKPIData } from '@/app/dashboard/types'
import MetricCard from '@/components/dashboard/MetricCard'
import DashboardFilters from '@/components/dashboard/DashboardFilters'
import YearComparisonSelector from '@/components/dashboard/YearComparisonSelector'
import ChartSection from '@/components/dashboard/ChartSection'
import ComparisonChart from '@/components/dashboard/ComparisonChart'
import { logger } from '@/lib/logger'
import {
  ChartDataArray,
  MonthlyRevenueData,
  MonthlyCollectionData,
  MonthlyConsumptionData,
  RevenueByPriceList,
  RevenueByDot,
  PieChartData
} from '@/lib/types/chart'
import { processYearData, calculateRate, getMonthLabels, scaleValues } from '@/lib/utils/chart-helpers'

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
  const [revenueChartData, setRevenueChartData] = useState<ChartDataArray>([])
  const [consumptionChartData, setConsumptionChartData] = useState<ChartDataArray>([])
  const [collectionRateChartData, setCollectionRateChartData] = useState<ChartDataArray>([])
  const [pieChartData, setPieChartData] = useState<PieChartData[]>([])
  const [pieType, setPieType] = useState<'GB' | 'Dot'>('GB')
  const [pieMetric, setPieMetric] = useState<'Revenue' | 'Consumption'>('Revenue')

  // Generate last 5 years for comparison
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth, comparisonYear])

  useEffect(() => {
    fetchPieData()
  }, [selectedYear, pieType, pieMetric])

  const fetchPieData = useCallback(async () => {
    try {
      let data: any[] = []
      const isRevenue = pieMetric === 'Revenue'

      if (pieType === 'GB') {
        data = isRevenue ? await getRevenueByPriceList(selectedYear) : await getConsumptionByPriceList(selectedYear)
      } else {
        data = isRevenue ? await getRevenueByDot(selectedYear) : await getConsumptionByDot(selectedYear)
      }

      // Calculate total for percentage in Legend
      const valueKey = isRevenue ? 'DoanhThu' : 'SanLuong'
      const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0)

      setPieChartData([{
        values: data.map((d) => d[valueKey]),
        labels: data.map((d) => {
          const label = pieType === 'GB' ? `GB ${d.GB}` : `Đợt ${d.Dot}`
          const val = Number(d[valueKey]) || 0
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0'
          return `${label}  ${pct}%`
        }),
        type: 'pie',
        textinfo: 'percent',
        textposition: 'inside',
        insidetextorientation: 'horizontal',
        hovertemplate: `<b>%{label}</b><br>${isRevenue ? 'Doanh thu' : 'Sản lượng'}: %{value:,.0f} ${isRevenue ? 'VNĐ' : 'm³'}<extra></extra>`
      }])
    } catch (e) {
      logger.error('Error fetching pie data:', e)
      toast.error('Không thể tải dữ liệu biểu đồ tròn')
    }
  }, [selectedYear, pieType, pieMetric])

  const fetchData = useCallback(async () => {
    try {
      // Parallel Fetching
      const [kpiData, { revenueData, collectionData, consumptionData }] = await Promise.all([
        getDashboardData(selectedMonth, selectedYear, selectedYear),
        getComparisonData(selectedYear, comparisonYear)
      ])

      // Cast response to typed object
      setStats(kpiData as unknown as DashboardKPIData)

      const months = getMonthLabels()

      // --- Prepare Chart Datasets ---
      const revCurrRaw = processYearData<MonthlyRevenueData>(selectedYear, revenueData, 'DoanhThu')
      const revCompRaw = processYearData<MonthlyRevenueData>(comparisonYear, revenueData, 'DoanhThu')

      const consCurrRaw = processYearData<MonthlyConsumptionData>(selectedYear, consumptionData, 'SanLuong')
      const consCompRaw = processYearData<MonthlyConsumptionData>(comparisonYear, consumptionData, 'SanLuong')

      const colCurrRaw = processYearData<MonthlyCollectionData>(selectedYear, collectionData, 'ThucThu')
      const colCompRaw = processYearData<MonthlyCollectionData>(comparisonYear, collectionData, 'ThucThu')

      // Calculate Rates (handle nulls safely)
      const rateCurr = calculateRate(colCurrRaw, revCurrRaw)
      const rateComp = calculateRate(colCompRaw, revCompRaw)

      // --- Set Chart State (Recharts) ---
      const combinedRevenueData = months.map((month, index) => ({
        name: month,
        current: revCurrRaw[index] ?? null,
        previous: revCompRaw[index] ?? null
      }))

      const combinedConsumptionData = months.map((month, index) => ({
        name: month,
        current: consCurrRaw[index] ?? null,
        previous: consCompRaw[index] ?? null
      }))

      setRevenueChartData(combinedRevenueData as any)
      setConsumptionChartData(combinedConsumptionData as any)

      setCollectionRateChartData([
        {
          x: months,
          y: rateComp,
          customdata: colCompRaw,
          type: 'bar',
          name: `${comparisonYear}`,
          marker: { color: '#3b82f6' },
          text: rateComp.map(v => v !== null ? v.toFixed(1) + '%' : ''),
          textposition: 'auto',
          hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Tỷ lệ: %{y:.2f}%<br>Thực thu: %{customdata:,.0f} VNĐ<extra></extra>'
        },
        {
          x: months,
          y: rateCurr,
          customdata: colCurrRaw,
          type: 'bar',
          name: `${selectedYear}`,
          marker: { color: '#ef4444' },
          text: rateCurr.map(v => v !== null ? v.toFixed(1) + '%' : ''),
          textposition: 'auto',
          hovertemplate: '<b>%{x}</b><br>Năm: %{data.name}<br>Tỷ lệ: %{y:.2f}%<br>Thực thu: %{customdata:,.0f} VNĐ<extra></extra>'
        }
      ])

    } catch (error) {
      logger.error('Error loading dashboard:', error)
      toast.error('Không thể tải dữ liệu dashboard. Vui lòng thử lại.')
    }
  }, [selectedYear, selectedMonth, comparisonYear])

  const handleRefresh = async () => {
    toast.promise(
      async () => {
        await forceRefreshDashboard()
        await fetchData()
        await fetchPieData()
      },
      {
        loading: 'Đang làm mới dữ liệu...',
        success: 'Dữ liệu đã được cập nhật!',
        error: 'Lỗi khi làm mới'
      }
    )
  }

  // Derived calculations for Metric Cards (memoized for performance)
  const yearlyOutstanding = useMemo(() => (stats.DoanhThu || 0) - (stats.ThucThu || 0), [stats])
  const yearlyOutstandingGB = useMemo(() => (stats.DoanhThu_GB || 0) - (stats.ThucThu_GB || 0), [stats])
  const completionRateTotal = useMemo(() => stats.DoanhThu > 0 ? (stats.ThucThu / stats.DoanhThu) * 100 : 0, [stats])
  const completionRateGB = useMemo(() => stats.DoanhThu_GB > 0 ? (stats.ThucThu_GB / stats.DoanhThu_GB) * 100 : 0, [stats])

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
            onRefresh={handleRefresh}
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
            {/* Custom Card for TIỀN NƯỚC (Renamed to Doanh Thu) (With Avg Price) */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="relative z-10 text-white">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">Doanh Thu</p>
                <h3 className="text-2xl font-black mb-2 tracking-tight">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(stats.DoanhThu_GB))}
                </h3>

                {/* Trend / Prev Value */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm font-bold flex items-center gap-1`}>
                    {Number(stats.DoanhThu_GB) >= Number(stats.DoanhThu_GB_Prev) ? '▲' : '▼'}
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.abs(Number(stats.DoanhThu_GB) - Number(stats.DoanhThu_GB_Prev)))}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-white/20">
                  {/* Total Revenue */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-white/90">Tổng doanh thu</span>
                    <span className="text-sm font-bold text-white">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(stats.DoanhThu))}
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
              value={Number(stats.ThucThu_GB)}
              type='currency'
              gradientColor='emerald'
              subValueLabel='Tổng thực thu'
              subValue={Number(stats.ThucThu)}
              iconPath={<svg className="w-32 h-32 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
            />
            <MetricCard
              title="Tồn thu"
              value={yearlyOutstandingGB}
              type='currency'
              gradientColor='orange' // Amber/Orange
              trendMode='inverse' // High Debt is Bad
              subValueLabel='Tổng tồn thu'
              subValue={yearlyOutstanding}
              iconPath={<svg className="w-32 h-32 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
            />

            {/* % Dat - Custom Card Logic (Complexity here warrants keeping custom initially) */}
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10 w-full text-white">
                <dt className="text-xs font-bold text-white/80 uppercase tracking-wider mb-4">% Hoàn thành</dt>

                <div className="mb-4">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-white/90">Tiền nước</span>
                    <span className="text-lg font-black text-white">{completionRateGB.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
                    <div className="bg-white h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${Math.min(completionRateGB, 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-white/90">Tổng doanh thu</span>
                    <span className="text-xl font-black text-white">{completionRateTotal.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
                    <div className="bg-white/80 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${Math.min(completionRateTotal, 100)}%` }}></div>
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
          <ComparisonChart
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
            data={consumptionChartData}
            currentYear={selectedYear}
            previousYear={comparisonYear}
            unit="m³"
            colorCurrent="#f97316"
            colorPrevious="#06b6d4"
          />
          <ComparisonChart
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
            data={revenueChartData}
            currentYear={selectedYear}
            previousYear={comparisonYear}
            unit="VNĐ"
            colorCurrent="#ef4444"
            colorPrevious="#3b82f6"
            isCurrency={true}
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
            title="Cơ cấu"
            chartType="pie"
            isPie={true}
            pieViewType={pieType}
            onPieTypeChange={setPieType}
            pieMetric={pieMetric}
            onPieMetricChange={setPieMetric}
            data={pieChartData}
            layout={{
              legend: { orientation: 'v', x: 1.02, y: 0.5, xanchor: 'left', yanchor: 'middle' },
              margin: { t: 20, b: 20, l: 20, r: 20 },
              uniformtext: { minsize: 10, mode: 'hide' }
            }}
          />
        </div>

      </main >
    </div >
  )
}
