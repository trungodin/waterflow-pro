'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import dynamic from 'next/dynamic'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
// @ts-ignore
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })
import { getDashboardData, getComparisonData } from '@/app/actions/dashboard'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    monthlyConsumption: 0,
    monthlyConsumptionPrev: 0,
    yearlyConsumption: 0,
    yearlyConsumptionPrev: 0,
    zeroConsumptionCount: 0,
    yearlyRevenue: 0,
    yearlyRevenueGB: 0,
    yearlyRevenuePrev: 0,
    yearlyRevenueGBPrev: 0,
    yearlyCollected: 0,
    yearlyCollectedGB: 0,
    yearlyOutstanding: 0,
    yearlyOutstandingGB: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])

  // Filters
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [comparisonYear, setComparisonYear] = useState(currentYear - 1)
  const [revenueChartData, setRevenueChartData] = useState<any[]>([])
  const [consumptionChartData, setConsumptionChartData] = useState<any[]>([])
  const [collectionRateChartData, setCollectionRateChartData] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth, comparisonYear])

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
        yearlyConsumptionPrev: Number(kpiData.SanLuong_Year_Prev) || 0,
        zeroConsumptionCount: Number(kpiData.DHN_BangKhong_Current) || 0,
        yearlyRevenue: Number(kpiData.DoanhThu) || 0,
        yearlyRevenueGB: Number(kpiData.DoanhThu_GB) || 0,
        yearlyRevenuePrev: Number(kpiData.DoanhThu_Prev) || 0,
        yearlyRevenueGBPrev: Number(kpiData.DoanhThu_GB_Prev) || 0,
        yearlyCollected: Number(kpiData.ThucThu) || 0,
        yearlyCollectedGB: Number(kpiData.ThucThu_GB) || 0,
        yearlyOutstanding: (Number(kpiData.DoanhThu) || 0) - (Number(kpiData.ThucThu) || 0),
        yearlyOutstandingGB: (Number(kpiData.DoanhThu_GB) || 0) - (Number(kpiData.ThucThu_GB) || 0)
      })

      // 2. Fetch Chart Comparison Data (Current Year vs Comparison Year)
      const { revenueData, collectionData, consumptionData } = await getComparisonData(selectedYear, comparisonYear)

      // Helper to process data for a specific year
      const processYearData = (year: number, data: any[], valueKey: string, scale: number = 1) => {
        const result = Array(12).fill(0)
        data.filter((d: any) => d.Nam === year).forEach((d: any) => {
          if (d.Ky >= 1 && d.Ky <= 12) {
            result[d.Ky - 1] = (Number(d[valueKey]) || 0) / scale
          }
        })
        return result
      }

      const months = Array.from({ length: 12 }, (_, i) => i + 1)

      // --- 1. Revenue Chart Data (Line) ---
      // Scale: Billion (Tỷ VNĐ)
      const revCurr = processYearData(selectedYear, revenueData, 'DoanhThu', 1_000_000_000)
      const revComp = processYearData(comparisonYear, revenueData, 'DoanhThu', 1_000_000_000)

      setRevenueChartData([
        {
          x: months,
          y: revComp,
          type: 'scatter',
          mode: 'lines+markers',
          name: `${comparisonYear}`,
          line: { color: '#3b82f6', width: 3 }, // Blue
          marker: { size: 6 }
        },
        {
          x: months,
          y: revCurr,
          type: 'scatter',
          mode: 'lines+markers',
          name: `${selectedYear}`,
          line: { color: '#ef4444', width: 3 }, // Red
          marker: { size: 6 }
        }
      ])


      // --- 2. Consumption Chart Data (Line) ---
      // Scale: Can use direct value or scale if needed. User asked for "Tỷ/Triệu" formatting.
      // 3,000,000 -> 3 (Million). Let's scale to Million (Triệu m3)
      const consCurr = processYearData(selectedYear, consumptionData, 'SanLuong', 1_000_000)
      const consComp = processYearData(comparisonYear, consumptionData, 'SanLuong', 1_000_000)

      setConsumptionChartData([
        {
          x: months,
          y: consComp,
          type: 'scatter',
          mode: 'lines+markers',
          name: `${comparisonYear}`,
          line: { color: '#06b6d4', width: 3 }, // Cyan
          marker: { size: 6 }
        },
        {
          x: months,
          y: consCurr,
          type: 'scatter',
          mode: 'lines+markers',
          name: `${selectedYear}`,
          line: { color: '#f97316', width: 3 }, // Orange
          marker: { size: 6 }
        }
      ])

      // --- 3. Collection Rate Chart Data (Bar) ---
      // (ThucThu / DoanhThu) * 100
      // Note: Use raw data for calculation to avoid double scaling issues or precision loss, 
      // but since we scaled both by same factor (if we did), ratio matches.
      // However, best to recalculate rate from raw or just use the scaled values since ratio is same.
      // Let's use the processYearData with scale=1 for Rate calculation to be safe.

      const revCurrRaw = processYearData(selectedYear, revenueData, 'DoanhThu', 1)
      const revCompRaw = processYearData(comparisonYear, revenueData, 'DoanhThu', 1)
      const colCurrRaw = processYearData(selectedYear, collectionData, 'ThucThu', 1)
      const colCompRaw = processYearData(comparisonYear, collectionData, 'ThucThu', 1)

      const calcRate = (thucThu: number[], doanhThu: number[]) => {
        return thucThu.map((tt, i) => {
          const dt = doanhThu[i]
          return dt > 0 ? (tt / dt) * 100 : 0
        })
      }

      const rateCurr = calcRate(colCurrRaw, revCurrRaw)
      const rateComp = calcRate(colCompRaw, revCompRaw)

      setCollectionRateChartData([
        {
          x: months,
          y: rateComp,
          type: 'bar',
          name: `${comparisonYear}`,
          marker: { color: '#3b82f6' },
          text: rateComp.map(v => v.toFixed(1) + '%'),
          textposition: 'auto'
        },
        {
          x: months,
          y: rateCurr,
          type: 'bar',
          name: `${selectedYear}`,
          marker: { color: '#ef4444' },
          text: rateCurr.map(v => v.toFixed(1) + '%'),
          textposition: 'auto'
        }
      ])

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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1">Tổng quan tình hình sản xuất & kinh doanh</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <div className="relative group">
              <span className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-bold text-blue-600 z-10 group-hover:text-blue-700 transition-colors">Tháng</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="block w-36 pl-4 pr-10 py-2.5 text-base font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-0 sm:text-sm cursor-pointer hover:border-blue-400 transition-colors appearance-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative group">
              <span className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-bold text-blue-600 z-10 group-hover:text-blue-700 transition-colors">Năm</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="block w-36 pl-4 pr-10 py-2.5 text-base font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-0 sm:text-sm cursor-pointer hover:border-blue-400 transition-colors appearance-none"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative group">
              <span className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-bold text-gray-500 z-10">So sánh với</span>
              <select
                value={comparisonYear}
                onChange={(e) => setComparisonYear(Number(e.target.value))}
                className="block w-36 pl-4 pr-10 py-2.5 text-base font-bold text-gray-500 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-0 sm:text-sm cursor-pointer hover:border-gray-400 transition-colors appearance-none"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transform transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Làm mới
            </button>
          </div>
        </div>

        {/* 1. KHỐI SẢN XUẤT (KPI SẢN LƯỢNG) */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Sản Xuất <span className="text-sm font-normal text-gray-500 ml-2">(Tháng {selectedMonth}/{selectedYear})</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card: Tổng ĐHN */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tổng ĐHN</p>
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-extrabold text-gray-900">{formatNumber(stats.totalCustomers)}</span>
                </div>
              </div>
              {/* Icon Background */}
              <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24 text-blue-600 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
            </div>

            {/* Card: Sản lượng Tháng */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sản lượng (Tháng)</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-extrabold text-blue-600">{formatNumber(stats.monthlyConsumption)}</span>
                  <span className="text-sm font-bold text-gray-400 mb-1">m³</span>
                </div>
                <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stats.monthlyConsumption >= stats.monthlyConsumptionPrev ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {stats.monthlyConsumption >= stats.monthlyConsumptionPrev ? '▲' : '▼'}
                  <span className="ml-1">{formatNumber(Math.abs(stats.monthlyConsumption - stats.monthlyConsumptionPrev))} m³</span>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24 text-blue-600 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </div>
            </div>

            {/* Card: Sản lượng Năm */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sản lượng (Năm {selectedYear})</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-extrabold text-indigo-600">{formatNumber(stats.yearlyConsumption)}</span>
                  <span className="text-sm font-bold text-gray-400 mb-1">m³</span>
                </div>
                {stats.yearlyConsumptionPrev > 0 && (
                  <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stats.yearlyConsumption >= stats.yearlyConsumptionPrev ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {stats.yearlyConsumption >= stats.yearlyConsumptionPrev ? '▲' : '▼'}
                    <span className="ml-1">{formatNumber(Math.abs(stats.yearlyConsumption - stats.yearlyConsumptionPrev))} m³</span>
                  </div>
                )}
              </div>
              <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24 text-indigo-600 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
            </div>

            {/* Card: ĐHN = 0 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">ĐHN 0 m³</p>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-orange-500">{formatNumber(stats.zeroConsumptionCount)}</span>
                </div>
                <p className="mt-1 text-xs text-orange-400 font-medium">Cần kiểm tra lại</p>
              </div>
              <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24 text-orange-500 transform translate-x-4 translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
            </div>
          </div>
        </section>

        {/* 2. KHỐI KINH DOANH (KPI DOANH THU) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Kinh Doanh <span className="text-sm font-normal text-gray-500 ml-2">(Năm {selectedYear})</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Doanh thu */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Doanh thu</dt>
                <dd className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-2xl font-extrabold text-green-600">
                    {formatCurrency(stats.yearlyRevenue)}
                  </span>
                </dd>
                {stats.yearlyRevenuePrev > 0 && (
                  <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${stats.yearlyRevenue >= stats.yearlyRevenuePrev ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {stats.yearlyRevenue >= stats.yearlyRevenuePrev ? '▲' : '▼'}
                    <span className="ml-1">{formatCurrency(Math.abs(stats.yearlyRevenue - stats.yearlyRevenuePrev))}</span>
                  </div>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 relative z-10">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500">Tiền nước</span>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(stats.yearlyRevenueGB)}</span>
                </div>
              </div>
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-32 h-32 text-green-600 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            {/* Thực thu */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Thực thu</dt>
                <dd className="mt-2 text-2xl font-extrabold text-green-600">
                  {formatCurrency(stats.yearlyCollected)}
                </dd>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 relative z-10">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500">Tiền nước</span>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(stats.yearlyCollectedGB)}</span>
                </div>
              </div>
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-32 h-32 text-green-600 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            {/* Tồn thu */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tồn thu</dt>
                <dd className="mt-2 text-2xl font-extrabold text-red-500">
                  {formatCurrency(stats.yearlyOutstanding)}
                </dd>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 relative z-10">
                <div className="flex justify-between items-center bg-red-50 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-red-500">Tiền nước</span>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(stats.yearlyOutstandingGB)}</span>
                </div>
              </div>
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-32 h-32 text-red-500 transform translate-x-8 -translate-y-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            {/* % Đạt */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10 w-full">
                <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider">% Hoàn thành (Thu tiền)</dt>

                {/* Progress Tổng */}
                <div className="mt-4">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-blue-800">Tổng doanh thu</span>
                    <span className="text-xl font-bold text-blue-600">
                      {stats.yearlyRevenue > 0 ? ((stats.yearlyCollected / stats.yearlyRevenue) * 100).toFixed(2) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.yearlyRevenue > 0 ? Math.min((stats.yearlyCollected / stats.yearlyRevenue) * 100, 100) : 0}%` }}></div>
                  </div>
                </div>

                {/* Progress Tiền nước */}
                <div className="mt-4">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-cyan-800">Tiền nước</span>
                    <span className="text-lg font-bold text-cyan-600">
                      {stats.yearlyRevenueGB > 0 ? ((stats.yearlyCollectedGB / stats.yearlyRevenueGB) * 100).toFixed(2) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-cyan-100 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.yearlyRevenueGB > 0 ? Math.min((stats.yearlyCollectedGB / stats.yearlyRevenueGB) * 100, 100) : 0}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-32 h-32 text-blue-600 transform translate-x-6 translate-y-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 1. Revenue Comparison Chart (Line) */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Doanh thu (Tỷ VNĐ)</h3>
            <div className="w-full h-[350px]">
              <Plot
                data={revenueChartData}
                layout={{
                  xaxis: { title: 'Kỳ', dtick: 1 },
                  yaxis: { title: 'Doanh thu (Tỷ)', tickformat: '.2f' },
                  legend: { orientation: 'h', y: 1.1 },
                  margin: { t: 20, b: 40, l: 60, r: 20 },
                  height: 350,
                  autosize: true,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          </section>

          {/* 2. Consumption Comparison Chart (Line) */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Sản lượng (Triệu m³)</h3>
            <div className="w-full h-[350px]">
              <Plot
                data={consumptionChartData}
                layout={{
                  xaxis: { title: 'Kỳ', dtick: 1 },
                  yaxis: { title: 'Sản lượng (Triệu m³)', tickformat: '.2f' },
                  legend: { orientation: 'h', y: 1.1 },
                  margin: { t: 20, b: 40, l: 60, r: 20 },
                  height: 350,
                  autosize: true,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          </section>
        </div>

        {/* 3. Collection Rate Comparison Chart (Bar) */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Tỷ lệ thực thu (%)</h3>
          <div className="w-full h-[350px]">
            <Plot
              data={collectionRateChartData}
              layout={{
                barmode: 'group',
                xaxis: { title: 'Kỳ', dtick: 1 },
                yaxis: { title: 'Tỷ lệ (%)', tickformat: '.1f', range: [0, 105] },
                legend: { orientation: 'h', y: 1.1 },
                margin: { t: 20, b: 40, l: 60, r: 20 },
                height: 350,
                autosize: true,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler={true}
            />
          </div>
        </section>

      </main>
    </div>
  )
}
