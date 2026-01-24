'use client'

import { useState } from 'react'

interface LatenessFiltersProps {
    onRunAnalysis: (formData: FormData) => void
    isPending: boolean
    defaultValues?: Record<string, any>
}

export default function LatenessFilters({ onRunAnalysis, isPending, defaultValues }: LatenessFiltersProps) {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-300 shadow-md mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🛠️ Bộ Lọc Phân Tích
            </h3>

            <form action={onRunAnalysis}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {/* Row 1: Period Selection */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Từ Kỳ</label>
                        <input
                            type="number"
                            name="fromKy"
                            min={1} max={12}
                            defaultValue={defaultValues?.fromKy ?? 1}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Từ Năm</label>
                        <input
                            type="number"
                            name="fromNam"
                            min={2020} max={2099}
                            defaultValue={defaultValues?.fromNam ?? currentYear}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Đến Kỳ</label>
                        <input
                            type="number"
                            name="toKy"
                            min={1} max={12}
                            defaultValue={defaultValues?.toKy ?? currentMonth}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Đến Năm</label>
                        <input
                            type="number"
                            name="toNam"
                            min={2020} max={2099}
                            defaultValue={defaultValues?.toNam ?? currentYear}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                    </div>

                    {/* Row 2: Advanced Filters */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Tổng công nợ tối thiểu &ge;</label>
                        <input
                            type="number"
                            name="minDebt"
                            min={0} step={100000}
                            defaultValue={defaultValues?.minDebt ?? 100000000}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 font-mono tracking-wide"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Lọc theo Đợt (VD: 1,2,5)</label>
                        <input
                            type="text"
                            name="dotFilter"
                            placeholder="VD: 1, 2, 3 (Để trống = Tất cả)"
                            defaultValue={defaultValues?.dotFilter ?? ''}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Toán tử GB</label>
                        <select
                            name="gbOperator"
                            defaultValue={defaultValues?.gbOperator ?? "Không lọc"}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Không lọc">Không lọc</option>
                            <option value="=">=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&ge;</option>
                            <option value="<=">&le;</option>
                            <option value="<>">&ne; (Khác)</option>
                            <option value="IN">IN (Trong danh sách)</option>
                            <option value="NOT IN">NOT IN (Ngoài danh sách)</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-900 font-bold">Giá trị GB</label>
                        <input
                            type="text"
                            name="gbValues"
                            placeholder="VD: 21 hoặc 31,11,21"
                            defaultValue={defaultValues?.gbValues ?? ''}
                            className="w-full px-3 py-2 border border-gray-400 text-gray-900 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex justify-center pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={isPending}
                        className={`px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all transform active:scale-95 ${isPending
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 hover:shadow-lg'
                            }`}
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xử lý dữ liệu...
                            </span>
                        ) : (
                            '🚀 Bắt đầu Phân tích'
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
