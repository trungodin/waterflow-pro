'use client'

import { useState, useEffect } from 'react'
import { 
    getReadingYearlyAnalysis, 
    getReadingYearlyComparison, 
    getReadingDotComparisonTwo,
    getReadingGBComparisonTwo,
    getReadingCoCuComparisonTwo,
    getReadingDotComparison,
    YearlyAnalysisData 
} from '@/app/readings/actions'
import { 
    BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts'

const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

export default function ReadingYearlyReport() {
    // ... existing state ...
    const [yearlyData, setYearlyData] = useState<YearlyAnalysisData[]>([])

    // ... (keep state definitions) ...
    // 2. Comparison State
    const currentYear = new Date().getFullYear()
    const [compYear1, setCompYear1] = useState(currentYear)
    const [compYear2, setCompYear2] = useState(currentYear - 1)
    const [comparisonData, setComparisonData] = useState<any[]>([])

    // 3. Dot Analysis State (Comparison)
    const [dotYear1, setDotYear1] = useState(currentYear)
    const [dotPeriod1, setDotPeriod1] = useState(new Date().getMonth() + 1)
    
    // Default Dot Period 2 to previous month or year
    const [dotYear2, setDotYear2] = useState(new Date().getMonth() === 0 ? currentYear - 1 : currentYear)
    const [dotPeriod2, setDotPeriod2] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth())
    
    const [dotData, setDotData] = useState<any[]>([])

    // 4. GB Analysis State (Comparison)
    const [gbYear1, setGbYear1] = useState(currentYear)
    const [gbPeriod1, setGbPeriod1] = useState(new Date().getMonth() + 1)
    
    const [gbYear2, setGbYear2] = useState(new Date().getMonth() === 0 ? currentYear - 1 : currentYear)
    const [gbPeriod2, setGbPeriod2] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth())
    
    const [gbData, setGbData] = useState<any[]>([])

    // 5. CoCu Analysis State (Comparison)
    const [cocuYear1, setCocuYear1] = useState(currentYear)
    const [cocuPeriod1, setCocuPeriod1] = useState(new Date().getMonth() + 1)
    
    const [cocuYear2, setCocuYear2] = useState(new Date().getMonth() === 0 ? currentYear - 1 : currentYear)
    const [cocuPeriod2, setCocuPeriod2] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth())
    
    const [cocuData, setCocuData] = useState<any[]>([])

    // Loading States
    const [loadingOverview, setLoadingOverview] = useState(true)
    const [loadingComparison, setLoadingComparison] = useState(false)
    const [loadingDot, setLoadingDot] = useState(false)
    const [loadingGB, setLoadingGB] = useState(true)
    const [loadingCoCu, setLoadingCoCu] = useState(true)

    // --- Effects ---

    // 1. Fetch Overview (Unchanged)
    useEffect(() => {
        const fetch = async () => {
            setLoadingOverview(true)
            const res = await getReadingYearlyAnalysis()
            setYearlyData(res)
            setLoadingOverview(false)
        }
        fetch()
    }, [])

    // 2. Fetch Comparison (Unchanged)
    useEffect(() => {
        const fetch = async () => {
            setLoadingComparison(true)
            const res = await getReadingYearlyComparison(compYear1, compYear2)
            setComparisonData(res)
            setLoadingComparison(false)
        }
        fetch()
    }, [compYear1, compYear2])

    // 3. Fetch Dot Data (Dual Comparison)
    useEffect(() => {
        const fetch = async () => {
            setLoadingDot(true)
            const res = await getReadingDotComparisonTwo(dotYear1, dotPeriod1, dotYear2, dotPeriod2)
            setDotData(res)
            setLoadingDot(false)
        }
        fetch()
    }, [dotYear1, dotPeriod1, dotYear2, dotPeriod2])

    // 4. Fetch GB Data
    useEffect(() => {
        const fetch = async () => {
            setLoadingGB(true)
            const res = await getReadingGBComparisonTwo(gbYear1, gbPeriod1, gbYear2, gbPeriod2)
            setGbData(res)
            setLoadingGB(false)
        }
        fetch()
    }, [gbYear1, gbPeriod1, gbYear2, gbPeriod2])

    // 5. Fetch CoCu Data
    useEffect(() => {
        const fetch = async () => {
            setLoadingCoCu(true)
            const res = await getReadingCoCuComparisonTwo(cocuYear1, cocuPeriod1, cocuYear2, cocuPeriod2)
            setCocuData(res)
            setLoadingCoCu(false)
        }
        fetch()
    }, [cocuYear1, cocuPeriod1, cocuYear2, cocuPeriod2])

    // --- Helpers ---
    const availableYears = Array.from({length: 10}, (_, i) => currentYear - i)
    const periods = Array.from({length: 12}, (_, i) => i + 1)

    if (loadingOverview) return <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2"><div className="animate-spin h-6 w-6 border-2 border-blue-600 rounded-full border-t-transparent"></div>Đang tải báo cáo...</div>

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* SECTION 1: YEARLY OVERVIEW */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-6 text-xl flex items-center gap-2">
                    📊 Tổng Quan Sản Lượng Theo Năm
                </h3>
                {/* ... (Keep Section 1 Content Unchanged) ... */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.9}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="Nam" tick={{fill: '#374151', fontSize: 12, fontWeight: 500}} axisLine={{stroke: '#e5e7eb'}} tickLine={false} />
                                <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)} tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg min-w-[200px]">
                                                    <p className="text-sm font-semibold text-gray-500 mb-2 border-b border-gray-100 pb-1">Năm {label}</p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                <span className="text-gray-600 text-sm">Sản lượng:</span>
                                                            </div>
                                                            <span className="text-blue-600 font-bold text-base">{formatNumber(Number(payload[0].value))} m³</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                                <span className="text-gray-600 text-sm">Khách hàng:</span>
                                                            </div>
                                                            <span className="text-gray-900 font-bold text-sm">{formatNumber(data.RecordCount)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="TotalConsumption" name="Sản Lượng (m³)" fill="url(#colorConsumption)" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                     <LabelList dataKey="TotalConsumption" position="top" formatter={(val: any) => formatNumber(Number(val))} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#1f2937' }} offset={10} />
                                </Bar>
                                <Line type="monotone" dataKey="TotalConsumption" stroke="#f97316" strokeWidth={3} dot={{r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Condensed Table */}
                    <div className="lg:col-span-1 border-l border-gray-100 pl-8">
                        <div className="overflow-y-auto max-h-[350px]">
                            <table className="w-full text-sm border-collapse border border-gray-300">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-bold text-gray-700 border border-gray-300">Năm</th>
                                        <th className="px-3 py-2 text-center font-bold text-gray-700 border border-gray-300">SL KH</th>
                                        <th className="px-3 py-2 text-right font-bold text-gray-700 border border-gray-300">Sản Lượng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {yearlyData.map((row) => (
                                        <tr key={row.Nam}>
                                            <td className="px-3 py-2 font-bold text-gray-900 border border-gray-300">{row.Nam}</td>
                                            <td className="px-3 py-2 text-center font-medium text-gray-600 border border-gray-300">{formatNumber(row.RecordCount)}</td>
                                            <td className="px-3 py-2 text-right font-bold text-blue-600 border border-gray-300">{formatNumber(row.TotalConsumption)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* SECTION 2: COMPARISON */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">📈 So Sánh 2 Năm</h3>
                        <div className="flex gap-2">
                             <select value={compYear1} onChange={(e) => setCompYear1(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors shadow-sm">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                             </select>
                             <span className="text-gray-400 font-bold px-1">vs</span>
                             <select value={compYear2} onChange={(e) => setCompYear2(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer transition-colors shadow-sm">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                             </select>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-[300px]">
                        {loadingComparison ? (
                             <div className="h-full flex items-center justify-center text-gray-400">Đang tải dữ liệu...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="Ky" label={{ value: 'Kỳ', position: 'insideBottomRight', offset: -5 }} />
                                    <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)} />
                                    <Tooltip 
                                        cursor={{fill: '#f3f4f6'}}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const v1 = Number(payload[0]?.value || 0)
                                                const v2 = Number(payload[1]?.value || 0)
                                                const diff = v1 - v2
                                                const percent = v2 > 0 ? (diff / v2) * 100 : 0
                                                const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                                                const icon = diff > 0 ? '▲' : diff < 0 ? '▼' : '−'

                                                return (
                                                    <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg min-w-[200px]">
                                                        <p className="text-sm font-semibold text-gray-500 mb-2 border-b border-gray-100 pb-1">Kỳ {label}</p>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center gap-2">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                                                    <span className="text-xs text-blue-700 font-semibold">Năm {compYear1}:</span>
                                                                </div>
                                                                <span className="font-bold text-gray-800">{formatNumber(v1)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-2">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                                                    <span className="text-xs text-red-700 font-semibold">Năm {compYear2}:</span>
                                                                </div>
                                                                <span className="font-bold text-gray-800">{formatNumber(v2)}</span>
                                                            </div>
                                                            <div className={`flex justify-between items-center gap-2 pt-2 mt-1 border-t border-gray-100 font-bold ${color}`}>
                                                                <span className="text-xs">Chênh lệch:</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs">{icon}</span>
                                                                    <span>{formatNumber(Math.abs(diff))} ({Math.abs(percent).toFixed(1)}%)</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="Year1" name={`Năm ${compYear1}`} stroke="#2563eb" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                    <Line type="monotone" dataKey="Year2" name={`Năm ${compYear2}`} stroke="#dc2626" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* SECTION 3: DOT ANALYSIS (NEW DUAL COMPARISON) */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="flex justify-between items-center">
                             <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">🌊 Sản Lượng Theo Đợt</h3>
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                             <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                                <select value={dotYear1} onChange={(e) => setDotYear1(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select value={dotPeriod1} onChange={(e) => setDotPeriod1(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-indigo-700 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                    {periods.map(p => <option key={p} value={p}>Kỳ {p}</option>)}
                                </select>
                             </div>
                             <span className="text-gray-400 font-extrabold px-1">VS</span>
                             <div className="flex items-center gap-2">
                                <select value={dotYear2} onChange={(e) => setDotYear2(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer">
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select value={dotPeriod2} onChange={(e) => setDotPeriod2(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-pink-700 bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer">
                                    {periods.map(p => <option key={p} value={p}>Kỳ {p}</option>)}
                                </select>
                                <span className="w-3 h-3 rounded-full bg-pink-600"></span>
                             </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px]">
                         {loadingDot ? (
                             <div className="h-full flex items-center justify-center text-gray-400">Đang tải dữ liệu...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={dotData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis 
                                        dataKey="Dot" 
                                        tick={{fill: '#374151', fontSize: 12, fontWeight: 500}} 
                                        axisLine={{stroke: '#e5e7eb'}} 
                                        tickLine={false}
                                        interval={0}
                                    />
                                    <YAxis 
                                        tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)} 
                                        tick={{fill: '#6b7280', fontSize: 12}}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        cursor={{fill: '#f3f4f6'}}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const v1 = Number(payload[0]?.value || 0)
                                                const v2 = Number(payload[1]?.value || 0)
                                                const diff = v1 - v2
                                                const percent = v2 > 0 ? (diff / v2) * 100 : 0
                                                const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                                                const icon = diff > 0 ? '▲' : diff < 0 ? '▼' : '−'

                                                return (
                                                    <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg min-w-[200px]">
                                                        <p className="text-sm font-semibold text-gray-500 mb-2 border-b border-gray-100 pb-1">Đợt {label}</p>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center gap-2">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                                                    <span className="text-xs text-indigo-700 font-semibold">Kỳ {dotPeriod1}/{dotYear1}:</span>
                                                                </div>
                                                                <span className="font-bold text-gray-800">{formatNumber(v1)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-2">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-2 h-2 rounded-full bg-pink-600"></div>
                                                                    <span className="text-xs text-pink-700 font-semibold">Kỳ {dotPeriod2}/{dotYear2}:</span>
                                                                </div>
                                                                <span className="font-bold text-gray-800">{formatNumber(v2)}</span>
                                                            </div>
                                                            <div className={`flex justify-between items-center gap-2 pt-2 mt-1 border-t border-gray-100 font-bold ${color}`}>
                                                                <span className="text-xs">Chênh lệch:</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs">{icon}</span>
                                                                    <span>{formatNumber(Math.abs(diff))} ({Math.abs(percent).toFixed(1)}%)</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Bar dataKey="Val1" name={`Kỳ ${dotPeriod1}/${dotYear1}`} fill="#4f46e5" radius={[3, 3, 0, 0]}>
                                        <LabelList 
                                            dataKey="Val1" 
                                            content={(props: any) => {
                                                const { x, y, width, index } = props
                                                const item = dotData[index]
                                                if (!item) return null
                                                
                                                const v1 = Number(item.Val1 || 0)
                                                const v2 = Number(item.Val2 || 0)
                                                
                                                if (v1 > v2) {
                                                    return <text x={Number(x) + Number(width)/2} y={Number(y) - 4} fill="#4f46e5" textAnchor="middle" style={{fontSize: '14px', fontWeight: '900'}}>★</text>
                                                }
                                                return null
                                            }} 
                                        />
                                    </Bar>
                                    <Bar dataKey="Val2" name={`Kỳ ${dotPeriod2}/${dotYear2}`} fill="#db2777" radius={[3, 3, 0, 0]}>
                                        <LabelList 
                                            dataKey="Val2" 
                                            content={(props: any) => {
                                                const { x, y, width, index } = props
                                                const item = dotData[index]
                                                if (!item) return null
                                                
                                                const v1 = Number(item.Val1 || 0)
                                                const v2 = Number(item.Val2 || 0)
                                                
                                                if (v2 > v1) {
                                                    return <text x={Number(x) + Number(width)/2} y={Number(y) - 4} fill="#db2777" textAnchor="middle" style={{fontSize: '14px', fontWeight: '900'}}>★</text>
                                                }
                                                return null
                                            }} 
                                        />
                                    </Bar>
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

            </div>

            {/* SECTIONS 4 & 5: GB & COCU ANALYSIS (GRID) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* SECTION 4: GB ANALYSIS (NEW) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">💰 Sản Lượng Theo Giá Biểu</h3>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm w-fit">
                            <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                            <select value={gbYear1} onChange={(e) => setGbYear1(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={gbPeriod1} onChange={(e) => setGbPeriod1(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-teal-700 bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
                                {periods.map(p => <option key={p} value={p}>Kỳ {p}</option>)}
                            </select>
                            </div>
                            <span className="text-gray-400 font-extrabold px-1">VS</span>
                            <div className="flex items-center gap-2">
                            <select value={gbYear2} onChange={(e) => setGbYear2(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={gbPeriod2} onChange={(e) => setGbPeriod2(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-orange-700 bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
                                {periods.map(p => <option key={p} value={p}>Kỳ {p}</option>)}
                            </select>
                            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                            </div>
                    </div>
                </div>
                <div className="h-[400px] w-full">
                        {loadingGB ? (
                            <div className="h-full flex items-center justify-center text-gray-400">Đang tải dữ liệu...</div>
                    ) : gbData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                             <div className="text-4xl">📭</div>
                             <span>Không có dữ liệu cho giai đoạn này</span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={gbData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="GB" tick={{fill: '#374151', fontSize: 12, fontWeight: 500}} axisLine={{stroke: '#e5e7eb'}} tickLine={false} interval={0} />
                                <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)} tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const v1 = Number(payload[0]?.value || 0)
                                            const v2 = Number(payload[1]?.value || 0)
                                            const diff = v1 - v2
                                            const percent = v2 > 0 ? (diff / v2) * 100 : 0
                                            const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                                            const icon = diff > 0 ? '▲' : diff < 0 ? '▼' : '−'

                                            return (
                                                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg min-w-[200px]">
                                                    <p className="text-sm font-semibold text-gray-500 mb-2 border-b border-gray-100 pb-1">Biểu Giá: {label}</p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                                                <span className="text-xs text-teal-700 font-semibold">Kỳ {gbPeriod1}/{gbYear1}:</span>
                                                            </div>
                                                            <span className="font-bold text-gray-800">{formatNumber(v1)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                                <span className="text-xs text-orange-700 font-semibold">Kỳ {gbPeriod2}/{gbYear2}:</span>
                                                            </div>
                                                            <span className="font-bold text-gray-800">{formatNumber(v2)}</span>
                                                        </div>
                                                        <div className={`flex justify-between items-center gap-2 pt-2 mt-1 border-t border-gray-100 font-bold ${color}`}>
                                                            <span className="text-xs">Chênh lệch:</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs">{icon}</span>
                                                                <span>{formatNumber(Math.abs(diff))} ({Math.abs(percent).toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Bar dataKey="Val1" name={`Kỳ ${gbPeriod1}/${gbYear1}`} fill="#14b8a6" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Val1" content={(props: any) => { const { x, y, width, index } = props; const item = gbData[index]; if (!item) return null; const v1 = Number(item.Val1 || 0); const v2 = Number(item.Val2 || 0); if (v1 > v2) return <text x={Number(x) + Number(width)/2} y={Number(y) - 4} fill="#14b8a6" textAnchor="middle" style={{fontSize: '14px', fontWeight: '900'}}>★</text>; return null; }} />
                                </Bar>
                                <Bar dataKey="Val2" name={`Kỳ ${gbPeriod2}/${gbYear2}`} fill="#f97316" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Val2" content={(props: any) => { const { x, y, width, index } = props; const item = gbData[index]; if (!item) return null; const v1 = Number(item.Val1 || 0); const v2 = Number(item.Val2 || 0); if (v2 > v1) return <text x={Number(x) + Number(width)/2} y={Number(y) - 4} fill="#f97316" textAnchor="middle" style={{fontSize: '14px', fontWeight: '900'}}>★</text>; return null; }} />
                                </Bar>
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* SECTION 5: COCU ANALYSIS (NEW) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">📏 Sản Lượng Theo Cỡ Đồng Hồ</h3>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm w-fit">
                            <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                            <select value={cocuYear1} onChange={(e) => setCocuYear1(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={cocuPeriod1} onChange={(e) => setCocuPeriod1(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-cyan-700 bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer">
                                {periods.map(p => <option key={p} value={p}>Kỳ {p}</option>)}
                            </select>
                            </div>
                            <span className="text-gray-400 font-extrabold px-1">VS</span>
                            <div className="flex items-center gap-2">
                            <select value={cocuYear2} onChange={(e) => setCocuYear2(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={cocuPeriod2} onChange={(e) => setCocuPeriod2(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-amber-700 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer">
                                {periods.map(p => <option key={p} value={p}>Kỳ {p}</option>)}
                            </select>
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            </div>
                    </div>
                </div>
                <div className="h-[400px] w-full">
                        {loadingCoCu ? (
                            <div className="h-full flex items-center justify-center text-gray-400">Đang tải dữ liệu...</div>
                    ) : cocuData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                             <div className="text-4xl">📭</div>
                             <span>Không có dữ liệu cho giai đoạn này</span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={cocuData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="CoCu" tick={{fill: '#374151', fontSize: 12, fontWeight: 500}} axisLine={{stroke: '#e5e7eb'}} tickLine={false} interval={0} />
                                <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)} tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const v1 = Number(payload[0]?.value || 0)
                                            const v2 = Number(payload[1]?.value || 0)
                                            const diff = v1 - v2
                                            const percent = v2 > 0 ? (diff / v2) * 100 : 0
                                            const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                                            const icon = diff > 0 ? '▲' : diff < 0 ? '▼' : '−'

                                            return (
                                                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg min-w-[200px]">
                                                    <p className="text-sm font-semibold text-gray-500 mb-2 border-b border-gray-100 pb-1">Cỡ ĐH: {label}</p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                                                <span className="text-xs text-cyan-700 font-semibold">Kỳ {cocuPeriod1}/{cocuYear1}:</span>
                                                            </div>
                                                            <span className="font-bold text-gray-800">{formatNumber(v1)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                                <span className="text-xs text-amber-700 font-semibold">Kỳ {cocuPeriod2}/{cocuYear2}:</span>
                                                            </div>
                                                            <span className="font-bold text-gray-800">{formatNumber(v2)}</span>
                                                        </div>
                                                        <div className={`flex justify-between items-center gap-2 pt-2 mt-1 border-t border-gray-100 font-bold ${color}`}>
                                                            <span className="text-xs">Chênh lệch:</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs">{icon}</span>
                                                                <span>{formatNumber(Math.abs(diff))} ({Math.abs(percent).toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Bar dataKey="Val1" name={`Kỳ ${cocuPeriod1}/${cocuYear1}`} fill="#06b6d4" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Val1" content={(props: any) => { const { x, y, width, index } = props; const item = cocuData[index]; if (!item) return null; const v1 = Number(item.Val1 || 0); const v2 = Number(item.Val2 || 0); if (v1 > v2) return <text x={Number(x) + Number(width)/2} y={Number(y) - 4} fill="#06b6d4" textAnchor="middle" style={{fontSize: '14px', fontWeight: '900'}}>★</text>; return null; }} />
                                </Bar>
                                <Bar dataKey="Val2" name={`Kỳ ${cocuPeriod2}/${cocuYear2}`} fill="#f59e0b" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Val2" content={(props: any) => { const { x, y, width, index } = props; const item = cocuData[index]; if (!item) return null; const v1 = Number(item.Val1 || 0); const v2 = Number(item.Val2 || 0); if (v2 > v1) return <text x={Number(x) + Number(width)/2} y={Number(y) - 4} fill="#f59e0b" textAnchor="middle" style={{fontSize: '14px', fontWeight: '900'}}>★</text>; return null; }} />
                                </Bar>
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
            </div>
        </div>
    )
}
