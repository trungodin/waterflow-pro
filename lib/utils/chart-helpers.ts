/**
 * Chart Helper Utilities
 * Reusable functions for processing and formatting chart data
 */

import { MonthlyDataArray, MonthlyDataValue } from '@/lib/types/chart'

/**
 * Process monthly data for a specific year
 * Handles future months as null to break chart lines
 */
export function processYearData<T extends { Nam: number; Ky: number }>(
    year: number,
    data: T[],
    valueKey: keyof T
): MonthlyDataArray {
    const result: MonthlyDataArray = Array(12).fill(null)
    const isCurrentYear = year === new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    data
        .filter((d) => d.Nam === year)
        .forEach((d) => {
            if (d.Ky >= 1 && d.Ky <= 12) {
                // Skip future months for current year
                if (isCurrentYear && d.Ky > currentMonth) return

                const val = Number(d[valueKey]) || 0
                result[d.Ky - 1] = val
            }
        })

    // Ensure future months remain null for current year
    if (isCurrentYear) {
        for (let i = currentMonth; i < 12; i++) {
            result[i] = null
        }
    }

    return result
}

/**
 * Calculate collection rate percentage
 * Handles null values safely to maintain chart gaps
 */
export function calculateRate(
    thucThu: MonthlyDataArray,
    doanhThu: MonthlyDataArray
): MonthlyDataArray {
    return thucThu.map((tt, i) => {
        const dt = doanhThu[i]
        if (tt === null || dt === null) return null
        return dt > 0 ? (tt / dt) * 100 : 0
    })
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value)
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value)
}

/**
 * Generate month labels for charts
 */
export function getMonthLabels(): string[] {
    return Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`)
}

/**
 * Scale values for chart display (e.g., convert to billions/millions)
 */
export function scaleValues(
    values: MonthlyDataArray,
    divisor: number
): MonthlyDataArray {
    return values.map((v) => (v !== null ? v / divisor : null))
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
    current: number,
    previous: number
): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`
}
