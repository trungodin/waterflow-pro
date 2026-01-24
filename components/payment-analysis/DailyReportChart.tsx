'use client'

import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import type { DailyStat } from '@/lib/analysis/payment-report'

interface DailyReportChartProps {
    data: DailyStat[] | undefined
}

export default function DailyReportChart({ data }: DailyReportChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 h-80 flex items-center justify-center text-gray-500">
                Chưa có dữ liệu để hiển thị biểu đồ
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Tiến Độ Theo Ngày</h3>
            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" name="Tổng Giao" fill="#94a3b8" barSize={20} />
                        <Bar dataKey="paid" name="Đã Thanh Toán" stackId="a" fill="#22c55e" barSize={20} />
                        <Bar dataKey="locked" name="Khóa Nước" stackId="a" fill="#ef4444" barSize={20} />
                        <Line type="monotone" dataKey="unlocked" name="Mở Nước" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
