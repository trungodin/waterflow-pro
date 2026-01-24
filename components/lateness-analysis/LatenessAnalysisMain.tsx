'use client'

import { useActionState, useState } from 'react'
import { runLatenessAnalysis, LatenessAnalysisState } from '@/app/actions/lateness-analysis'
import LatenessFilters from './LatenessFilters'
import LatenessSummary from './LatenessSummary'
import LatenessDetailTable from './LatenessDetailTable'

const initialState: LatenessAnalysisState = {
    data: undefined,
    error: undefined,
    lastUpdated: 0
}

export default function LatenessAnalysisMain() {
    const [state, formAction, isPending] = useActionState(runLatenessAnalysis, initialState)
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">⏱️ Phân Tích Tình Trạng Thanh Toán</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Phân tích chi tiết mức độ đúng hạn/trễ hạn thanh toán hóa đơn trong khoảng thời gian chỉ định.
                </p>
            </div>

            <LatenessFilters
                onRunAnalysis={formAction}
                isPending={isPending}
                defaultValues={state.inputs}
            />

            {state.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center gap-2 mb-6">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {state.error}
                </div>
            )}

            {state.data ? (
                <>
                    <LatenessSummary
                        data={state.data}
                        selectedGroup={selectedGroup}
                        onSelectGroup={setSelectedGroup}
                    />
                    <LatenessDetailTable
                        data={state.data.details}
                        filteredClassification={selectedGroup}
                    />
                </>
            ) : (
                !isPending && !state.error && (
                    <div className="flex flex-col items-center justify-center p-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-center">
                        <div className="text-6xl mb-4 opacity-20">📊</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu phân tích</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Vui lòng chọn khoảng thời gian và nhấn nút <b>"Bắt đầu Phân tích"</b> để xem báo cáo chi tiết.
                        </p>
                    </div>
                )
            )}
        </div>
    )
}
