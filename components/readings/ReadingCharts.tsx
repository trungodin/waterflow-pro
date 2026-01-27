'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { getReadingChartData, ReadingFilters } from '@/app/readings/actions'

interface ReadingChartsProps {
    filters: ReadingFilters | null
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function ReadingCharts({ filters }: ReadingChartsProps) {
    const [chartType, setChartType] = useState<string | null>(null)
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [chartTitle, setChartTitle] = useState("")

    const handleLoadChart = async (type: string, title: string) => {
        if (!filters) return
        setLoading(true)
        setChartType(type)
        setChartTitle(title)
        
        // Map button type to API groupBy param
        let groupBy = ""
        if (type === 'gb') groupBy = 'GB'
        else if (type === 'cocu') groupBy = 'CoCu'
        else if (type === 'hieucu') groupBy = 'HieuCu'
        else if (type === 'dot_consumption') groupBy = 'dot_consumption'
        else if (type === 'may') groupBy = 'May'
        
        try {
            const data = await getReadingChartData(filters, groupBy)
            // Process data for chart
            // Python limits to top 20 or 30
            const processed = data.slice(0, 30).map((item: any) => ({
                name: item[groupBy === 'dot_consumption' ? 'Dot' : 
                           (groupBy === 'GB' ? 'GB' : 
                           (groupBy === 'CoCu' ? 'CoCu' : 
                           (groupBy === 'HieuCu' ? 'HieuCu' : 
                           (groupBy === 'May' ? 'May' : 'name'))))] || 'N/A',
                value: groupBy === 'dot_consumption' ? item.TotalConsumption : item.RecordCount,
                subValue: groupBy === 'dot_consumption' ? item.DanhBaCount : null // For tooltip
            }))
            
            setChartData(processed)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (!filters) return null

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-400 shadow-sm mt-6">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">📊 Biểu đồ Phân tích</h3>
            
            <div className="flex flex-wrap gap-4 mb-6">
                 <button 
                    onClick={() => handleLoadChart('gb', 'Phân bố theo Giá Biểu')}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${chartType === 'gb' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                 >
                    BĐ theo Giá Biểu
                 </button>
                 <button 
                    onClick={() => handleLoadChart('cocu', 'Phân bố theo Cỡ Cũ')}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${chartType === 'cocu' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                 >
                    BĐ theo Cỡ Cũ
                 </button>
                 <button 
                    onClick={() => handleLoadChart('hieucu', 'Phân bố theo Hiệu Cũ')}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${chartType === 'hieucu' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                 >
                    BĐ theo Hiệu Cũ
                 </button>
                 <button 
                    onClick={() => handleLoadChart('dot_consumption', 'Sản Lượng theo Đợt')}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${chartType === 'dot_consumption' ? 'bg-green-100 text-green-800 ring-1 ring-green-400' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                 >
                    📈 BĐ Sản Lượng Đợt
                 </button>
                 <button 
                    onClick={() => handleLoadChart('may', 'Phân bố theo Tổ Máy')}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${chartType === 'may' ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-400' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                 >
                    🏭 BĐ theo Tổ Máy
                 </button>
            </div>

            {loading ? (
                 <div className="h-[400px] flex items-center justify-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
                    Đang tải dữ liệu biểu đồ...
                 </div>
            ) : chartData.length > 0 ? (
                <div className="h-[500px] w-full">
                    <h4 className="text-center font-bold text-gray-700 mb-2">{chartTitle} (Top 30)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                angle={-45} 
                                textAnchor="end" 
                                height={60} 
                                interval={0} 
                                tick={{fontSize: 11}}
                            />
                            <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)} />
                            <Tooltip 
                                formatter={(val: any, name: any, props: any) => {
                                    if (val === undefined || val === null) return ["", ""]
                                    const formattedVal = new Intl.NumberFormat('vi-VN').format(Number(val))
                                    if (chartType === 'dot_consumption') {
                                        return [
                                            <div key="val">
                                                <div>Sản lượng: {formattedVal}</div>
                                                <div className="text-xs text-gray-400">Số danh bạ: {props.payload.subValue}</div>
                                            </div>, 
                                            ""
                                        ]
                                    }
                                    return [formattedVal, "Số lượng"]
                                }}
                            />
                            <Bar dataKey="value" fill={chartType === 'dot_consumption' ? '#34d399' : '#8884d8'} radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                    Chọn loại biểu đồ để hiển thị
                </div>
            )}
        </div>
    )
}
