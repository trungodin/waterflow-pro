'use client'

import { useActionState } from 'react'
import { generatePaymentReport, AnalysisState } from '@/app/actions/analysis'
import AnalysisFilters from './AnalysisFilters'
import SummaryStats from './SummaryStats'
import DailyReportChart from './DailyReportChart'
import CustomerDetailsTable from './CustomerDetailsTable'

const initialState: AnalysisState = {
    data: undefined,
    error: undefined,
    lastUpdated: 0
}

export default function PaymentAnalysisMain() {
    const [state, formAction, isPending] = useActionState(generatePaymentReport, initialState)

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-gray-800">📊 Phân Tích Thanh Toán & Đóng Mở Nước</h2>
                <p className="text-sm text-gray-500">
                    Phân tích tình hình thu tiền dựa trên Danh sách giao (Google Sheet) và dữ liệu hóa đơn (Hệ thống).
                </p>
            </div>

            {/* Filters Form */}
            <AnalysisFilters onGenerate={formAction} isPending={isPending} />

            {/* Error Message */}
            {state.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {state.error}
                </div>
            )}

            {/* Content */}
            {state.data && (
                <div className="space-y-6">
                    <SummaryStats data={state.data} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-3">
                            <DailyReportChart data={state.data.dailyStats} />
                        </div>
                    </div>

                    <CustomerDetailsTable data={state.data.customerDetails} />
                </div>
            )}

            {/* Empty State / Initial Instructions */}
            {!state.data && !state.error && !isPending && (
                <div className="p-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                    <div className="text-gray-400 text-5xl mb-4">📈</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu phân tích</h3>
                    <p className="text-gray-500">Vui lòng chọn khoảng thời gian và nhấn nút <b>"Phân Tích"</b> để xem báo cáo.</p>
                </div>
            )}
        </div>
    )
}
