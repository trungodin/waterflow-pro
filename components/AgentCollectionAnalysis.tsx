'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getAgentCollectionData, getOutstandingAnalysisData } from '@/app/actions/agent-collection'
import type { AgentCollectionRow, OutstandingAnalysis } from '@/app/actions/agent-collection'

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val)
const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

export default function AgentCollectionAnalysis() {
    // Current date
    const today = new Date().toISOString().split('T')[0]

    // State
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
    
    const [agentData, setAgentData] = useState<AgentCollectionRow[]>([])
    const [outstandingData, setOutstandingData] = useState<OutstandingAnalysis | null>(null)
    
    const [loading, setLoading] = useState(false)

    // Initial Load
    useEffect(() => {
        handleRunAnalysis()
    }, [])

    const handleRunAnalysis = async () => {
        setLoading(true)
        try {
             // Run both parallel
             const [agentRes, outstandingRes] = await Promise.all([
                 getAgentCollectionData(startDate, endDate),
                 getOutstandingAnalysisData()
             ])
             
             setAgentData(agentRes)
             setOutstandingData(outstandingRes)

        } catch (error) {
            console.error(error)
            alert('Lỗi khi tải dữ liệu Thu Hộ')
        } finally {
            setLoading(false)
        }
    }

    // Prepare chart data (filter small values if needed, or just show top)
    // Legacy app shows all.
    // Chart data needs specific shape. agentData is already good.

    // Calculate totals for footer
    const totalAmount = agentData.reduce((acc, row) => acc + row.TongCong, 0)
    const totalCount = agentData.reduce((acc, row) => acc + row.TongHoaDon, 0)

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-center text-blue-600 mb-4">💳 Dashboard Phân Tích Đăng ngân Thu Hộ</h2>

            {/* Filters */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button 
                    onClick={handleRunAnalysis}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                    {loading ? 'Đang tải...' : 'Xem Dữ Liệu'}
                </button>
            </div>

            <hr className="border-gray-200" />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Left Column: Table (3/5) */}
                <div className="lg:col-span-3 space-y-4">
                    <h3 className="text-lg font-bold text-blue-600">Bảng Tổng Hợp Doanh Thu</h3>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-blue-600 text-white select-none">
                                <tr>
                                    <th className="px-3 py-3 text-left font-bold border-r border-blue-500">Ngân Hàng</th>
                                    <th className="px-3 py-3 text-right font-bold border-r border-blue-500">Tổng cộng</th>
                                    <th className="px-3 py-3 text-right font-bold border-r border-blue-500">Tổng hoá đơn</th>
                                    <th className="px-3 py-3 text-right font-bold">Tỷ lệ (%)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {agentData.length === 0 ? (
                                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Không có dữ liệu</td></tr>
                                ) : (
                                    agentData.map((row) => (
                                        <tr key={row.NganHang} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-100">{row.NganHang}</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900 border-r border-gray-100 bg-green-50">{formatCurrency(row.TongCong)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900 border-r border-gray-100 bg-orange-50">{formatNumber(row.TongHoaDon)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900 bg-amber-50">{row.TyLe.toFixed(2)}%</td>
                                        </tr>
                                    ))
                                )}
                                {/* Total Row */}
                                {agentData.length > 0 && (
                                    <tr className="bg-orange-400 text-white font-bold">
                                         <td className="px-3 py-2 border-r border-orange-300">Tổng cộng</td>
                                         <td className="px-3 py-2 text-right border-r border-orange-300">{formatCurrency(totalAmount)}</td>
                                         <td className="px-3 py-2 text-right border-r border-orange-300">{formatNumber(totalCount)}</td>
                                         <td className="px-3 py-2 text-right">100.00%</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Metrics & Chart (2/5) */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-blue-600 mb-4">Phân Tích Tồn</h3>
                        <div className="space-y-3">
                            {outstandingData ? (
                                <>
                                    <MetricCard label="Tồn năm cũ" value={outstandingData.TonNamCu} />
                                    <MetricCard label={`Tồn các kỳ năm ${new Date().getFullYear()}`} value={outstandingData.TonLuyKeNamHienTai} />
                                    <MetricCard label={`Tồn kỳ ${new Date().getMonth() + 1}/${new Date().getFullYear()}`} value={outstandingData.TonKyHienTai} />
                                    <MetricCard label="Tồn tất cả" value={outstandingData.TonTatCa} highlight />
                                </>
                            ) : (
                                <div className="text-gray-500 italic">Đang tải dữ liệu tồn...</div>
                            )}
                        </div>
                    </div>

                    <div className="h-[300px] border border-gray-200 rounded-lg p-2 bg-white">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="NganHang" type="category" width={120} tick={{fontSize: 12}} interval={0} />
                                <Tooltip 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-xl z-50">
                                                    <p className="font-bold text-slate-800 mb-1 text-sm border-b border-slate-100 pb-1">{label}</p>
                                                    <div className="space-y-1 mt-1">
                                                        <p className="text-blue-600 font-bold text-sm flex justify-between gap-4">
                                                            <span>💰 Tổng tiền:</span>
                                                            <span>{formatCurrency(data.TongCong)}</span>
                                                        </p>
                                                        <p className="text-orange-600 font-bold text-sm flex justify-between gap-4">
                                                            <span>🧾 Hóa đơn:</span>
                                                            <span>{formatNumber(data.TongHoaDon)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar 
                                    dataKey="TongCong" 
                                    fill="#2563eb" 
                                    radius={[0, 6, 6, 0]} 
                                    barSize={24}
                                    activeBar={{ fill: '#1d4ed8', stroke: '#1e40af', strokeWidth: 1 }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ label, value, highlight = false }: { label: string, value: number, highlight?: boolean }) {
    return (
        <div className={`border rounded-lg p-3 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <div className="text-gray-500 font-bold text-sm mb-1">{label}</div>
            <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-green-600'}`}>
                {formatCurrency(value)}
            </div>
        </div>
    )
}
