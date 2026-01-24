'use server'

import { getPaymentAnalysis, PaymentReportSummary } from '@/lib/analysis/payment-report'
import { isDemoMode } from '@/lib/env'

export type AnalysisState = {
    data?: PaymentReportSummary
    error?: string
    lastUpdated?: number
}

export async function generatePaymentReport(
    prevState: AnalysisState | null,
    formData: FormData
): Promise<AnalysisState> {
    // Demo Mode check
    if (isDemoMode) {
        return {
            error: 'Chức năng này không khả dụng ở chế độ Demo (thiếu kết nối Database).',
            lastUpdated: Date.now()
        }
    }

    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const group = formData.get('group') as string

    if (!startDate || !endDate) {
        return {
            error: 'Vui lòng chọn ngày bắt đầu và kết thúc.',
            lastUpdated: Date.now()
        }
    }

    try {
        const data = await getPaymentAnalysis({
            startDate,
            endDate,
            group: group || 'Tất cả các nhóm'
        })

        return {
            data,
            lastUpdated: Date.now()
        }
    } catch (error: any) {
        console.error('Report Generation Error:', error)
        return {
            error: error.message || 'Đã xảy ra lỗi khi tạo báo cáo.',
            lastUpdated: Date.now()
        }
    }
}
