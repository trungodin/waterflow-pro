'use client'

import { LatenessAnalysisResult } from '@/lib/analysis/payment-lateness'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface LatenessSummaryProps {
    data: LatenessAnalysisResult | undefined
    selectedGroup: string | null
    onSelectGroup: (group: string | null) => void
}

const FILL_COLORS = {
    "⭐ Xuất sắc (90-100%)": "#00b050",
    "✅ Tốt (70-89%)": "#92d050",
    "⚠️ Trung bình (50-69%)": "#ffc000",
    "❌ Kém (30-49%)": "#ff6600",
    "🔴 Rất kém (<30%)": "#ff0000"
}

// Order for display consistency
const ORDER = [
    "⭐ Xuất sắc (90-100%)",
    "✅ Tốt (70-89%)",
    "⚠️ Trung bình (50-69%)",
    "❌ Kém (30-49%)",
    "🔴 Rất kém (<30%)"
]

export default function LatenessSummary({ data, selectedGroup, onSelectGroup }: LatenessSummaryProps) {
    if (!data) return null

    const { summary } = data

    // Format Logic
    const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ'

    // Prepare Chart Data
    const chartData = Object.entries(summary.classificationCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📊 Thống Kê Tổng Quan</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded ml-2">
                    {summary.totalCustomers} Khách hàng
                </span>
            </div>

            {/* 1. Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-gray-500 text-sm font-medium">📈 Tỷ Lệ TB</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{summary.avgRate.toFixed(2)}%</p>
                    <p className="text-xs text-gray-400 mt-2">Trung bình toàn bộ</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-gray-500 text-sm font-medium">🏆 Cao Nhất</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{summary.maxRate.toFixed(2)}%</p>
                    <p className="text-xs text-gray-400 mt-2">Khách hàng tốt nhất</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-gray-500 text-sm font-medium">⚠️ Thấp Nhất</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{summary.minRate.toFixed(2)}%</p>
                    <p className="text-xs text-gray-400 mt-2">Cần lưu ý</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-gray-500 text-sm font-medium">⭐ Xuất Sắc</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{summary.excellentCount}</p>
                    <p className="text-xs text-gray-400 mt-2">Khách hàng &ge; 80%</p>
                </div>
            </div>

            {/* 1.5 Filter Buttons */}
            <div className="mb-6 animate-in fade-in slide-in-from-bottom duration-700 delay-100">
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        🔍 Xem chi tiết từng nhóm
                    </h3>
                    <p className="text-xs text-gray-400 italic">Click vào nút bên dưới để lọc danh sách chi tiết</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {ORDER.map((group) => {
                        const count = summary.classificationCounts[group] || 0
                        const isSelected = selectedGroup === group
                        const baseColor = FILL_COLORS[group as keyof typeof FILL_COLORS]

                        // Extract label (e.g., "Xuất sắc") from full string "⭐ Xuất sắc (90-100%)"
                        let label = group.split(' (')[0]
                        if (label.includes('Xuất sắc')) label = '⭐ Xuất sắc'
                        else if (label.includes('Tốt')) label = '✅ Tốt'
                        else if (label.includes('Trung bình')) label = '⚠️ TB'
                        else if (label.includes('Rất kém')) label = '🔴 Rất kém'
                        else if (label.includes('Kém')) label = '❌ Kém'

                        return (
                            <button
                                key={group}
                                onClick={() => onSelectGroup(isSelected ? null : group)}
                                className={`
                                    relative px-3 py-2 rounded-lg border text-sm font-medium transition-all
                                    flex flex-col items-center justify-center gap-1
                                    ${isSelected
                                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md transform scale-105 z-10'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }
                                    ${count === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                disabled={count === 0}
                            >
                                <span>{label}</span>
                                <span className={`text-xs ${isSelected ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                    ({count})
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 2. Chart & Breakdown Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Classification Table */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h4 className="font-semibold text-gray-700">📋 Phân loại khách hàng</h4>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phân loại</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {chartData.map((item) => {
                                const percentage = ((item.value / summary.totalCustomers) * 100).toFixed(1)
                                return (
                                    <tr key={item.name} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span
                                                    className="w-3 h-3 rounded-full mr-2"
                                                    style={{ backgroundColor: FILL_COLORS[item.name as keyof typeof FILL_COLORS] || '#ccc' }}
                                                ></span>
                                                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                            {item.value}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono">
                                            {percentage}%
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm min-h-[300px] flex flex-col">
                    <h4 className="font-semibold text-gray-700 mb-4 text-center">Biểu đồ phân bố</h4>
                    <div className="flex-1 w-full h-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={FILL_COLORS[entry.name as keyof typeof FILL_COLORS] || '#cccccc'}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => [new Intl.NumberFormat('vi-VN').format(Number(value)), 'Số khách hàng']}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '2px solid #374151',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        color: '#111827',
                                        fontWeight: '600'
                                    }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    )
}
