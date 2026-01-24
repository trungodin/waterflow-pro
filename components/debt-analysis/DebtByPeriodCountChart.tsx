'use client'

import { useState } from 'react'
import { DebtByPeriodCount } from '@/lib/analysis/debt-invoice'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'


interface DebtByPeriodCountChartProps {
    data: DebtByPeriodCount[]
}

export default function DebtByPeriodCountChart({ data }: DebtByPeriodCountChartProps) {
    // Formatter for Chart Axis (Compact with 'Tỷ')
    const formatAxis = (val: number) => {
        if (val === 0) return '0';
        if (val >= 1000000000) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(val / 1000000000) + ' Tỷ';
        if (val >= 1000000) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(val / 1000000) + ' Tr';
        return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val);
    }

    // Formatter for Tooltip (Compact with Tỷ/Triệu as requested)
    const formatTooltipValue = (val: number) => {
        if (val >= 1000000000) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(val / 1000000000) + ' Tỷ';
        if (val >= 1000000) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(val / 1000000) + ' Triệu';
        return new Intl.NumberFormat('vi-VN').format(val);
    }

    // Formatter for Table (Full standard format)
    const formatTableValue = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

    const [metric, setMetric] = useState<'debt' | 'count'>('debt')



    return (
        <div className="bg-white p-6 rounded-xl border border-gray-400 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">🔢 Thống kê theo Số Kỳ Nợ</h3>
                    <p className="text-sm text-gray-700 font-medium">Phân loại khách hàng dựa trên số lượng kỳ hóa đơn chưa thanh toán.</p>
                </div>

                {/* Toggle */}
                <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                    <button
                        onClick={() => setMetric('debt')}
                        className={`px-4 py-2 rounded-md transition-all ${metric === 'debt'
                            ? 'bg-white text-red-700 shadow-sm border border-gray-200'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        💰 Tổng Tiền
                    </button>
                    <button
                        onClick={() => setMetric('count')}
                        className={`px-4 py-2 rounded-md transition-all ${metric === 'count'
                            ? 'bg-white text-purple-700 shadow-sm border border-gray-200'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        👥 Số Khách Hàng
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Section */}
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                            <XAxis dataKey="soKyNo" label={{ value: 'Số Kỳ Nợ', position: 'insideBottom', offset: -5, fill: '#1f2937', fontWeight: 'bold' }} tick={{ fill: '#1f2937' }} />

                            {metric === 'debt' ? (
                                <YAxis
                                    tickFormatter={formatAxis}
                                    stroke="#b91c1c"
                                    label={{ value: 'Tổng Tiền', angle: -90, position: 'insideLeft', fill: '#b91c1c', fontWeight: 'bold' }}
                                    tick={{ fill: '#b91c1c', fontWeight: 600 }}
                                />
                            ) : (
                                <YAxis
                                    stroke="#7c3aed"
                                    label={{ value: 'Số KH', angle: -90, position: 'insideLeft', fill: '#7c3aed', fontWeight: 'bold' }}
                                    tick={{ fill: '#7c3aed', fontWeight: 600 }}
                                />
                            )}

                            <Tooltip
                                formatter={(value: any, name: any) => {
                                    if (metric === 'debt') return [formatTooltipValue(Number(value)) + ' VNĐ', 'Tổng Nợ']
                                    return [new Intl.NumberFormat('vi-VN').format(Number(value)), 'Số khách hàng']
                                }}
                                labelFormatter={(label) => `Nợ ${label} Kỳ`}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '2px solid #374151',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    color: '#111827',
                                    fontWeight: '600'
                                }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            {metric === 'debt' ? (
                                <Bar dataKey="tongNo" name="Tổng Nợ" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={50} />
                            ) : (
                                <Bar dataKey="soLuongKH" name="Số Khách Hàng" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto border border-gray-300 rounded-lg h-fit max-h-[400px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-300 text-sm relative">
                        <thead className="bg-gray-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-gray-900 border-b border-gray-300">Số Kỳ Nợ</th>
                                <th className={`px-4 py-3 text-right font-bold border-b border-gray-300 ${metric === 'count' ? 'text-purple-700 bg-purple-50' : 'text-gray-900'}`}>Số Khách Hàng</th>
                                <th className={`px-4 py-3 text-right font-bold border-b border-gray-300 ${metric === 'debt' ? 'text-red-700 bg-red-50' : 'text-gray-900'}`}>Tổng Nợ (VNĐ)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 bg-white">
                            {data.map((item) => (
                                <tr key={item.soKyNo} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-bold text-gray-900">{item.soKyNo} Kỳ</td>
                                    <td className={`px-4 py-3 text-right font-bold ${metric === 'count' ? 'text-purple-700 bg-purple-50' : 'text-purple-600'}`}>
                                        {item.soLuongKH}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${metric === 'debt' ? 'text-red-700 bg-red-50' : 'text-red-600'}`}>
                                        {formatTableValue(item.tongNo)}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">Chưa có dữ liệu</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    )
}
