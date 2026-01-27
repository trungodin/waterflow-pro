
import { Dispatch, SetStateAction } from 'react'

interface YearComparisonSelectorProps {
    selectedYear: number
    setSelectedYear: Dispatch<SetStateAction<number>>
    comparisonYear: number
    setComparisonYear: Dispatch<SetStateAction<number>>
    years: number[]
}

export default function YearComparisonSelector({
    selectedYear,
    setSelectedYear,
    comparisonYear,
    setComparisonYear,
    years
}: YearComparisonSelectorProps) {
    return (
        <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
            <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs sm:text-sm font-bold border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 py-1 pl-2 pr-6 cursor-pointer bg-red-50 text-red-700 border-red-200"
            >
                {years.map(y => (
                    <option key={`main-${y}`} value={y}>{y}</option>
                ))}
            </select>
            <span className="text-gray-400 text-xs font-bold">vs</span>
            <select 
                value={comparisonYear} 
                onChange={(e) => setComparisonYear(Number(e.target.value))}
                className="text-xs sm:text-sm font-bold border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 cursor-pointer bg-blue-50 text-blue-700 border-blue-200"
            >
                {years.map(y => (
                    <option key={`comp-${y}`} value={y}>{y}</option>
                ))}
            </select>
        </div>
    )
}
