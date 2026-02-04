'use client'

import React from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'

interface ComparisonChartProps {
    title: React.ReactNode
    data: any[]
    currentYear: number
    previousYear: number
    unit: string
    colorCurrent: string
    colorPrevious: string
    height?: number
    isCurrency?: boolean
}

const CustomTooltip = ({ active, payload, label, currentYear, previousYear, unit, isCurrency }: any) => {
    if (active && payload && payload.length) {
        // Recharts payload only includes active points?
        // If hovering a categorical axis, usually both are passed if available in data object.
        // However, if one is null, Recharts might filter it out of payload or include it with null value.
        // We check `payload` array content.

        // Attempt to find by dataKey
        const currItem = payload.find((p: any) => p.dataKey === 'current')
        const prevItem = payload.find((p: any) => p.dataKey === 'previous')

        // Value extraction (handle null/undefined)
        const currVal = currItem && currItem.value !== undefined && currItem.value !== null ? Number(currItem.value) : null
        const prevVal = prevItem && prevItem.value !== undefined && prevItem.value !== null ? Number(prevItem.value) : null

        const hasCurr = currVal !== null
        const hasPrev = prevVal !== null

        // If both undefined/null (gap in both years), don't show tooltip
        if (!hasCurr && !hasPrev) return null

        // Diff Calculation
        let diff = 0
        let percent = 0
        // Only verify diff to show if BOTH are present
        const showDiff = hasCurr && hasPrev

        if (showDiff) {
            // logic: (Current - Previous)
            diff = (currVal as number) - (prevVal as number)
            if ((prevVal as number) !== 0) {
                percent = (diff / (prevVal as number)) * 100
            } else {
                percent = diff > 0 ? 100 : 0
            }
        }

        const formatValue = (val: number) => {
            const options: Intl.NumberFormatOptions = {
                maximumFractionDigits: isCurrency ? 0 : 2
            }
            return new Intl.NumberFormat('vi-VN', options).format(val)
        }

        return (
            <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl z-50 min-w-[240px]">
                <p className="font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">{label}</p>

                {hasCurr && (
                    <div className="flex justify-between items-center gap-4 mb-2">
                        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: currItem?.stroke || '#333' }}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currItem?.stroke || '#333' }}></span>
                            Năm {currentYear}:
                        </span>
                        <span className="text-sm font-bold text-gray-800 tabular-nums">
                            {formatValue(currVal as number)} {unit}
                        </span>
                    </div>
                )}

                {hasPrev && (
                    <div className="flex justify-between items-center gap-4 mb-3">
                        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: prevItem?.stroke || '#333' }}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prevItem?.stroke || '#333' }}></span>
                            Năm {previousYear}:
                        </span>
                        <span className="text-sm font-bold text-gray-800 tabular-nums">
                            {formatValue(prevVal as number)} {unit}
                        </span>
                    </div>
                )}

                {/* Difference Row */}
                {showDiff && (
                    <div className={`text-sm font-bold flex items-center gap-2 ${diff >= 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'} p-2 rounded-lg`}>
                        <span>{diff > 0 ? 'Tăng' : (diff < 0 ? 'Giảm' : 'Chênh lệch')}:</span>
                        <span className="ml-auto flex items-center tabular-nums">
                            {diff > 0 ? '▲' : (diff < 0 ? '▼' : '-')} {formatValue(Math.abs(diff))} ({Math.abs(percent).toFixed(1)}%)
                        </span>
                    </div>
                )}
            </div>
        )
    }
    return null
}

export default function ComparisonChart({
    title,
    data,
    currentYear,
    previousYear,
    unit,
    colorCurrent,
    colorPrevious,
    height = 350,
    isCurrency = false
}: ComparisonChartProps) {

    const formatYAxis = (value: number) => {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} Tỷ`
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)} Tr`
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
        return `${value}`
    }

    return (
        <section className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all border-none h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 min-h-[40px]">
                {typeof title === 'string' ? (
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                ) : (
                    <div className="text-xl font-bold text-slate-800 w-full">{title}</div>
                )}
            </div>

            <div className="w-full flex-grow" style={{ minHeight: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 11 }}
                            interval={0}
                            dy={10}
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            tickFormatter={formatYAxis}
                            width={60}
                        />
                        <Tooltip
                            content={<CustomTooltip currentYear={currentYear} previousYear={previousYear} unit={unit} isCurrency={isCurrency} />}
                            cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />

                        <Line
                            type="monotone"
                            dataKey="previous"
                            name={`Năm ${previousYear}`}
                            stroke={colorPrevious}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 0, fill: colorPrevious }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            connectNulls={false} // Ensure gap
                            animationDuration={1500}
                        />
                        <Line
                            type="monotone"
                            dataKey="current"
                            name={`Năm ${currentYear}`}
                            stroke={colorCurrent}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 0, fill: colorCurrent }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            connectNulls={false} // Ensure gap
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    )
}
