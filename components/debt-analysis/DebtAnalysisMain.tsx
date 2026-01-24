'use client'

import { useActionState, useState } from 'react'
import { runDebtAnalysis, DebtAnalysisState } from '@/app/actions/debt-analysis'
import DebtByYearChart from './DebtByYearChart'
import DebtByPeriodCountChart from './DebtByPeriodCountChart'

const initialState: DebtAnalysisState = {
    data: undefined,
    error: undefined,
    lastUpdated: 0
}

export default function DebtAnalysisMain() {
    const [state, formAction, isPending] = useActionState(runDebtAnalysis, initialState)
    const [activeTab, setActiveTab] = useState<'year' | 'period'>('year')

    return (
        <div className="space-y-6">
            {/* Header / Intro */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    📊
                </div>
                <div>
                    <h3 className="font-semibold text-blue-900">Phân Tích Hóa Đơn Nợ</h3>
                    <p className="text-sm text-blue-700 mt-1">
                        Thống kê chi tiết tình hình nợ theo Năm và Số lượng kỳ nợ.
                        Giúp xác định nhóm khách hàng nợ lâu và xu hướng nợ qua các năm.
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col items-center justify-center text-center">

                <form action={formAction}>
                    {/* Hidden inputs for defaults if needed, or let Server Action handle defaults */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all transform hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Đang tổng hợp dữ liệu...
                            </>
                        ) : (
                            <>
                                📊 Bắt đầu Phân tích Nợ
                            </>
                        )}
                    </button>
                    {state.lastUpdated ? (
                        <p className="mt-3 text-xs text-gray-400">
                            Cập nhật lần cuối: {new Date(state.lastUpdated).toLocaleTimeString()}
                        </p>
                    ) : null}
                </form>
            </div>

            {/* Error Message */}
            {state.error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    🚫 {state.error}
                </div>
            )}

            {/* Results */}
            {state.data && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-gray-500 text-sm font-medium">Tổng Khách Hàng Nợ</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {new Intl.NumberFormat('vi-VN').format(state.data.summary.totalCustomers)}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-gray-500 text-sm font-medium">Tổng Số Hóa Đơn</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">
                                {new Intl.NumberFormat('vi-VN').format(state.data.summary.totalInvoices)}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-gray-500 text-sm font-medium">Tổng Tiền Nợ</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">
                                {new Intl.NumberFormat('vi-VN').format(state.data.summary.totalDebt)} VNĐ
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('year')}
                                className={`${activeTab === 'year'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                            >
                                📅 Thống kê theo Năm
                            </button>
                            <button
                                onClick={() => setActiveTab('period')}
                                className={`${activeTab === 'period'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                            >
                                🔢 Thống kê theo Số Kỳ Nợ
                            </button>
                        </nav>
                    </div>

                    {/* Charts content */}
                    <div className="mt-4">
                        {activeTab === 'year' ? (
                            <DebtByYearChart data={state.data.byYear} />
                        ) : (
                            <DebtByPeriodCountChart data={state.data.byPeriodCount} />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
