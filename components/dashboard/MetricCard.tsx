
import { formatNumber, formatCurrency } from '@/lib/utils'

interface MetricCardProps {
    title: string
    value: number | string
    type?: 'number' | 'currency'
    unit?: string
    prevValue?: number
    trendMode?: 'inverse' | 'normal' // 'normal': high is good (green), 'inverse': high is bad (red like debt)
    gradientColor: 'cyan' | 'sky' | 'blue' | 'indigo' | 'emerald' | 'orange' | 'purple'
    iconPath: React.ReactNode
    description?: string // For extra text like "High Priority"
    subValueLabel?: string // e.g. "Tiền nước"
    subValue?: number | string
}

const colorMap = {
    cyan: 'from-cyan-400 to-cyan-600 shadow-cyan-200',
    sky: 'from-sky-400 to-sky-600 shadow-sky-200',
    blue: 'from-blue-400 to-blue-600 shadow-blue-200',
    indigo: 'from-indigo-400 to-indigo-600 shadow-indigo-200',
    emerald: 'from-emerald-400 to-emerald-600 shadow-emerald-200',
    orange: 'from-orange-400 to-orange-600 shadow-orange-200', // orange/amber mix
    purple: 'from-violet-500 to-purple-600 shadow-purple-200',
}

export default function MetricCard({
    title,
    value,
    type = 'number',
    unit,
    prevValue = 0,
    trendMode = 'normal',
    gradientColor,
    iconPath,
    description,
    subValueLabel,
    subValue
}: MetricCardProps) {
    const formattedValue = (typeof value === 'number')
        ? (type === 'currency' ? formatCurrency(value) : formatNumber(value))
        : value

    const diff = (typeof value === 'number' && typeof prevValue === 'number')
        ? value - prevValue
        : 0
    const isIncrease = diff >= 0

    // Trend logic
    // Normal: Increase = Good (Green), Decrease = Bad (Red)
    // Inverse: Increase = Bad (Red), Decrease = Good (Green) -> e.g. Debt
    let trendColor = 'text-emerald-600'
    if (trendMode === 'normal') {
        trendColor = isIncrease ? 'text-emerald-600' : 'text-rose-600'
    } else {
        trendColor = isIncrease ? 'text-rose-600' : 'text-emerald-600'
    }

    return (
        <div className={`bg-gradient-to-br ${colorMap[gradientColor]} rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-full`}>
            {/* Main Content */}
            <div className="relative z-10 text-white">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-2">{title}</p>
                <div className="flex items-end gap-2 text-white flex-wrap">
                    <span className={`${type === 'currency' ? 'text-3xl' : 'text-4xl'} font-black tracking-tight`}>
                        {formattedValue}
                    </span>
                    {unit && <span className="text-sm font-bold opacity-80 mb-2">{unit}</span>}
                </div>

                {/* Trend Badge */}
                {prevValue > 0 && (
                    <div className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white shadow-sm ${trendColor}`}>
                        {isIncrease ? '▲' : '▼'}
                        <span className="ml-1">
                            {type === 'currency' ? formatCurrency(Math.abs(diff)) : formatNumber(Math.abs(diff))} {unit}
                        </span>
                    </div>
                )}

                {/* Extra Description Tag */}
                {description && (
                    <p className="mt-3 text-xs font-bold text-white bg-white/20 backdrop-blur-sm border border-white/20 inline-block px-2 py-1 rounded-lg">
                        {description}
                    </p>
                )}
            </div>

            {/* Footer Sub-stats (optional) */}
            {subValueLabel && subValue !== undefined && (
                <div className="mt-5 pt-4 border-t border-white/20 relative z-10 w-full">
                    <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-lg">
                        <span className="text-sm font-semibold text-white/80">{subValueLabel}</span>
                        <span className="text-xl font-bold text-white">
                            {typeof subValue === 'number' ? (type === 'currency' ? formatCurrency(subValue) : formatNumber(subValue)) : subValue}
                        </span>
                    </div>
                </div>
            )}

            {/* Background Icon */}
            <div className="absolute right-0 bottom-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity duration-500 text-white pointer-events-none">
                {iconPath}
            </div>

            <div className="absolute right-0 top-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity duration-500 text-white pointer-events-none">
                {/* Optional Top Decoration for some cards */}
            </div>
        </div>
    )
}
