'use client'

import { useState, useEffect } from 'react'
import { getReadingYearlyAnalysis, YearlyAnalysisData } from '@/app/readings/actions'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'

const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

export default function ReadingYearlyReport() {
    const [data, setData] = useState<YearlyAnalysisData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const res = await getReadingYearlyAnalysis()
            setData(res)
            setLoading(false)
        }
        fetch()
    }, [])

    if (loading) return <div className="p-8 text-center">Đang tải báo cáo tổng hợp năm...</div>
    if (data.length === 0) return <div className="p-8 text-center">Không có dữ liệu tổng hợp năm.</div>

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Chart Section */}
            <div className="bg-white p-5 rounded-xl border border-gray-400 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">📊 Biểu đồ Sản Lượng Tiêu Thụ Theo Năm</h3>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="Nam" />
                            <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)} />
                            <Tooltip 
                                formatter={(val: any) => [formatNumber(Number(val)), "Sản Lượng"]}
                                labelFormatter={(label) => `Năm ${label}`}
                            />
                            <Legend />
                            <Bar dataKey="TotalConsumption" name="Sản Lượng Tiêu Thụ" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                                 <LabelList dataKey="TotalConsumption" position="top" formatter={(val: any) => formatNumber(Number(val))} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white p-5 rounded-xl border border-gray-400 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">📋 Bảng Số Liệu Chi Tiết</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-gray-900">Năm</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-900">Số Lượng Bản Ghi</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-900">Tổng Sản Lượng (m3)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.map((row) => (
                                <tr key={row.Nam} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-bold text-gray-900">{row.Nam}</td>
                                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(row.RecordCount)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-700">{formatNumber(row.TotalConsumption)}</td>
                                </tr>
                            ))}
                             {/* Total Row */}
                            <tr className="bg-blue-50 font-bold border-t-2 border-blue-200 text-blue-900">
                                <td className="px-4 py-3">TỔNG CỘNG</td>
                                <td className="px-4 py-3 text-right">{formatNumber(data.reduce((sum, r) => sum + r.RecordCount, 0))}</td>
                                <td className="px-4 py-3 text-right">{formatNumber(data.reduce((sum, r) => sum + r.TotalConsumption, 0))}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
