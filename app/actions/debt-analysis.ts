'use server'

import { getDebtAnalysis, DebtAnalysisResult, DebtAnalysisFilter } from '@/lib/analysis/debt-invoice'

export type DebtAnalysisState = {
    data?: DebtAnalysisResult
    inputs?: Record<string, any>
    error?: string
    lastUpdated?: number
}

export async function runDebtAnalysis(
    prevState: DebtAnalysisState | null,
    formData: FormData
): Promise<DebtAnalysisState> {
    const rawInputs = {
        toKy: formData.get('toKy'),
        toNam: formData.get('toNam'),
        minDebt: formData.get('minDebt'),
        dotFilter: formData.get('dotFilter'),
        gbOperator: formData.get('gbOperator'),
        gbValues: formData.get('gbValues'),
    }

    // Default to current date if not provided
    const now = new Date()
    const toKy = Number(rawInputs.toKy) || (now.getMonth() + 1)
    const toNam = Number(rawInputs.toNam) || now.getFullYear()
    const minDebt = Number(rawInputs.minDebt) || 0

    // Parse Filters
    let dotFilter: number[] | undefined
    const dotValues = formData.get('dotFilter') as string
    if (dotValues) {
        dotFilter = dotValues.split(',').map(Number).filter(n => !isNaN(n))
    }

    let gbFilter: DebtAnalysisFilter['gbFilter'] | undefined
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

    try {
        const data = await getDebtAnalysis({
            toKy, toNam, minDebt, dotFilter, gbFilter
        })

        return {
            data,
            inputs: rawInputs,
            lastUpdated: Date.now()
        }
    } catch (error: any) {
        console.error('Debt Analysis Error:', error)
        return {
            inputs: rawInputs,
            error: error.message || 'Đã xảy ra lỗi khi phân tích hóa đơn nợ.',
            lastUpdated: Date.now()
        }
    }
}


