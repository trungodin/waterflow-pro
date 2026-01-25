'use client'

import { useState } from 'react'
import { runWeeklyReportAnalysis, WeeklyReportParams, WeeklyReportResult } from '@/lib/actions/weekly-report'
import WeeklyReportSummary from './WeeklyReportSummary'
import WeeklyReportDetails from './WeeklyReportDetails'
import WeeklyReportStats from './WeeklyReportStats'

export default function WeeklyReportMain() {
    // Params State
    // Helper to convert yyyy-mm-dd to dd/mm/yyyy for display
    const formatDateForDisplay = (isoDate: string) => {
        if (!isoDate) return ''
        const [year, month, day] = isoDate.split('-')
        return `${day}/${month}/${year}`
    }

    // Helper to convert dd/mm/yyyy to yyyy-mm-dd for storage
    const formatDateForStorage = (displayDate: string) => {
        if (!displayDate || !displayDate.includes('/')) return displayDate
        const parts = displayDate.split('/')
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        return displayDate
    }

    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const [dateRange, setDateRange] = useState({
        start: firstDay.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
    })
    const [group, setGroup] = useState('Tất cả các nhóm')
    const [method, setMethod] = useState<'accumulative' | 'average'>('accumulative')
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const [deadline, setDeadline] = useState<string>(
        nextWeek.toISOString().split('T')[0]
    )
    const [notes, setNotes] = useState<string[]>(['đóng cửa không ở', 'trở ngại - trình dời'])

    // Data State
    const [data, setData] = useState<WeeklyReportResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRun = async () => {
        setLoading(true)
        setError('')
        try {
            const params: WeeklyReportParams = {
                startDate: dateRange.start,  // Already in yyyy-mm-dd format
                endDate: dateRange.end,
                selectedGroup: group,
                calculationMethod: method,
                paymentDeadline: deadline,
                completedNotes: notes
            }

            const res = await runWeeklyReportAnalysis(params)
            if (res.error) {
                setError(res.error)
                setData(null)
            } else {
                setData(res)
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi không xác định')
        } finally {
            setLoading(false)
        }
    }

    const { generateWeeklyReportPDF, generateDetailedListPDF } = require('@/lib/utils/pdf-generator')

    const handleDownloadWeeklyPDF = async () => {
        if (!data) return
        try {
            await generateWeeklyReportPDF(data, {
                startDate: dateRange.start,
                endDate: dateRange.end,
                selectedGroup: group
            })
        } catch (error) {
            console.error(error)
            setError('Lỗi khi tạo PDF Báo Cáo Tuần')
        }
    }

    const handleDownloadDetailPDF = async () => {
        if (!data) return
        try {
            const dateDisplay = dateRange.start === dateRange.end
                ? `Ngày giao ${formatDateForDisplay(dateRange.start)}`
                : `Thời gian giao: ${formatDateForDisplay(dateRange.start)} đến ${formatDateForDisplay(dateRange.end)}`

            const title = `DANH SÁCH KHÁCH HÀNG ${group.toUpperCase()} - ${dateDisplay}`
            await generateDetailedListPDF(data.details, title)
        } catch (error) {
            console.error(error)
            setError('Lỗi khi tạo PDF Chi Tiết')
        }
    }

    return (
        <div className="space-y-6">
            {/* Filters Card */}
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-slate-400">
                <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                    <span>⚙️</span> Tùy chọn Báo cáo
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-black">Khoảng thời gian</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full p-2.5 bg-white border-2 border-slate-500 rounded-lg text-sm font-bold text-black focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm"
                                style={{ colorScheme: 'light' }}
                            />
                            <span className="text-black self-center font-bold text-lg">-</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full p-2.5 bg-white border-2 border-slate-500 rounded-lg text-sm font-bold text-black focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm"
                                style={{ colorScheme: 'light' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-black">Nhóm</label>
                        <select
                            value={group}
                            onChange={e => setGroup(e.target.value)}
                            className="w-full p-2.5 bg-white border-2 border-slate-500 rounded-lg text-sm font-bold text-black focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm"
                        >
                            <option value="Tất cả các nhóm" className="font-bold text-black">Tất cả các nhóm</option>
                            {['Sang Sơn', 'Thi Náo'].map(g => (
                                <option key={g} value={g} className="font-bold text-black">{g}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-black">Phương thức tính</label>
                        <div className="flex bg-slate-200 p-1 rounded-lg border border-slate-400">
                            <button
                                onClick={() => setMethod('accumulative')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${method === 'accumulative' ? 'bg-white shadow-md text-blue-800 ring-1 ring-slate-400' : 'text-slate-900 hover:bg-slate-300'}`}
                            >
                                Lũy kế
                            </button>
                            <button
                                onClick={() => setMethod('average')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${method === 'average' ? 'bg-white shadow-md text-blue-800 ring-1 ring-slate-400' : 'text-slate-900 hover:bg-slate-300'}`}
                            >
                                Trung bình
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-black">
                            {method === 'accumulative' ? 'Ngày TT cuối cùng' : 'Ghi chú coi là hoàn thành'}
                        </label>
                        {method === 'accumulative' ? (
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-500 rounded-lg text-sm font-bold text-black focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm"
                                style={{ colorScheme: 'light' }}
                            />
                        ) : (
                            <div className="text-xs text-slate-800 italic pt-2 font-bold px-1">
                                Tính theo ngày giao + 9 ngày
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-800 disabled:opacity-70 flex items-center gap-2 transition-all border border-blue-900"
                    >
                        {loading ? <span className="animate-spin">⏳</span> : <span>🚀</span>}
                        Chạy Phân Tích
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-900 rounded-lg border border-red-300 flex items-center gap-2 font-bold">
                        <span>⚠️</span> {error}
                    </div>
                )}
            </div>

            {/* Results */}
            {data && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Summary Section */}
                    <div className="flex justify-end gap-3 mb-2">
                        <button
                            onClick={handleDownloadWeeklyPDF}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-md flex items-center gap-2 text-sm transition-colors border border-red-800"
                        >
                            <span>📕</span> Tải PDF BC Tuần
                        </button>
                        <button
                            onClick={handleDownloadDetailPDF}
                            className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded shadow-md flex items-center gap-2 text-sm transition-colors border border-slate-900"
                        >
                            <span>📄</span> Tải PDF Chi tiết
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <WeeklyReportSummary summary={data.summary} pieData={data.pieChartData} />
                        </div>
                    </div>

                    {/* Stats Table (Thống kê Đóng/Mở) */}
                    <WeeklyReportStats stats={data.stats} />

                    {/* Details Table */}
                    <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden">
                        <div className="p-4 border-b border-slate-300 bg-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-base">📋 Danh sách chi tiết</h3>
                            <span className="text-sm font-medium text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-300 shadow-sm">{data.details.length} khách hàng</span>
                        </div>
                        <WeeklyReportDetails data={data.details} />
                    </div>
                </div>
            )}
        </div>
    )
}
