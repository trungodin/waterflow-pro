
import { Dispatch, SetStateAction } from 'react'

interface DashboardFiltersProps {
    selectedMonth: number
    setSelectedMonth: Dispatch<SetStateAction<number>>
    selectedYear: number
    setSelectedYear: Dispatch<SetStateAction<number>>
    onRefresh: () => void
    years: number[]
}

export default function DashboardFilters({
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    onRefresh,
    years
}: DashboardFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            {/* Month Selector */}
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

            {/* Year Selector */}
            <div className="relative group">
                <span className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-bold text-blue-600 z-10 group-hover:text-blue-700 transition-colors">Năm</span>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="block w-36 pl-4 pr-10 py-2.5 text-base font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-0 sm:text-sm cursor-pointer hover:border-blue-400 transition-colors appearance-none"
                >
                    {years.map(y => (
                        <option key={y} value={y}>Năm {y}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <button
                onClick={onRefresh}
                className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transform transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Làm mới
            </button>
        </div>
    )
}
