'use server'

import { getLatenessAnalysis, LatenessAnalysisResult, LatenessFilter } from '@/lib/analysis/payment-lateness'
import { isDemoMode } from '@/lib/env'

export type LatenessAnalysisState = {
    data?: LatenessAnalysisResult
    inputs?: Record<string, any>
    error?: string
    lastUpdated?: number
}

export async function runLatenessAnalysis(
    prevState: LatenessAnalysisState | null,
    formData: FormData
): Promise<LatenessAnalysisState> {
    // Capture raw inputs for persistence
    const rawInputs = {
        fromKy: formData.get('fromKy'),
        fromNam: formData.get('fromNam'),
        toKy: formData.get('toKy'),
        toNam: formData.get('toNam'),
        minDebt: formData.get('minDebt'),
        dotFilter: formData.get('dotFilter'),
        gbOperator: formData.get('gbOperator'),
        gbValues: formData.get('gbValues'),
    }

    // Demo Mode check
    if (isDemoMode) {
        return {
            inputs: rawInputs,
            error: 'Chức năng này không khả dụng ở chế độ Demo (thiếu kết nối Database).',
            lastUpdated: Date.now()
        }
    }

    // Parse form data
    const fromKy = Number(rawInputs.fromKy)
    const fromNam = Number(rawInputs.fromNam)
    const toKy = Number(rawInputs.toKy)
    const toNam = Number(rawInputs.toNam)
    const minDebt = Number(rawInputs.minDebt) || 0

    // Parse Filters
    let dotFilter: number[] | undefined
    const dotValues = formData.get('dotFilter') as string
    if (dotValues) {
        dotFilter = dotValues.split(',').map(Number).filter(n => !isNaN(n))
    }

    let gbFilter: LatenessFilter['gbFilter'] | undefined
    const gbOperator = formData.get('gbOperator') as string
    const gbValueStr = formData.get('gbValues') as string

    if (gbOperator && gbOperator !== 'Không lọc') {
        gbFilter = { operator: gbOperator }
        if (gbValueStr) {
            if (['IN', 'NOT IN', '<>'].includes(gbOperator)) {
                gbFilter.values = gbValueStr.split(',').map(Number).filter(n => !isNaN(n))
            } else {
                const val = Number(gbValueStr)
                if (!isNaN(val)) gbFilter.value = val
            }
        }
    }

    // Validate Input
    if (fromNam * 100 + fromKy > toNam * 100 + toKy) {
        return {
            inputs: rawInputs,
            error: 'Lỗi: Kỳ/Năm bắt đầu phải nhỏ hơn hoặc bằng Kỳ/Năm kết thúc.',
            lastUpdated: Date.now()
        }
    }

    try {
        const data = await getLatenessAnalysis({
            fromKy, fromNam, toKy, toNam, minDebt, dotFilter, gbFilter
        })

        return {
            data,
            inputs: rawInputs,
            lastUpdated: Date.now()
        }
    } catch (error: any) {
        console.error('Lateness Analysis Error:', error)
        return {
            inputs: rawInputs,
            error: error.message || 'Đã xảy ra lỗi khi phân tích dữ liệu.',
            lastUpdated: Date.now()
        }
    }
}
