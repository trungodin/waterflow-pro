'use client'

import { useState } from 'react'

interface DebtAnalysisFiltersProps {
    isPending: boolean
    lastUpdated?: number
}

export default function DebtAnalysisFilters({ isPending, lastUpdated }: DebtAnalysisFiltersProps) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                🛠️ Bộ Lọc Phân Tích Nợ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. To Period */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Đến Kỳ / Năm</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            name="toKy"
                            defaultValue={currentMonth}
                            min={1} max={12}
                            className="w-16 px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 text-center shadow-sm"
                            placeholder="Kỳ"
                        />
                        <span className="self-center text-gray-600 font-bold">/</span>
                        <input
                            type="number"
                            name="toNam"
                            defaultValue={currentYear}
                            min={2020} max={2030}
                            className="flex-1 px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 text-center shadow-sm"
                            placeholder="Năm"
                        />
                    </div>
                </div>

                {/* 2. Min Debt */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Mức nợ tối thiểu &ge;</label>
                    <input
                        type="number"
                        name="minDebt"
                        defaultValue={0}
                        step={1000}
                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 shadow-sm"
                        placeholder="VD: 500000"
                    />
                </div>

                {/* 3. Dot Filter */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Lọc theo Đợt (VD: 1,2,5)</label>
                    <input
                        type="text"
                        name="dotFilter"
                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 shadow-sm"
                        placeholder="VD: 1, 2, 3 (Để trống = Tất cả)"
                    />
                </div>

                {/* 4. GB Filter */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Giá trị GB</label>
                    <div className="flex gap-2">
                        <select
                            name="gbOperator"
                            className="w-1/3 px-2 py-2 border border-gray-400 rounded-lg text-sm font-bold text-gray-800 shadow-sm"
                        >
                            <option value="Không lọc">Không lọc</option>
                            <option value="=">=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value="IN">Trong (IN)</option>
                            <option value="NOT IN">Ngoài (NOT IN)</option>
                            <option value="<>">Khác (&lt;&gt;)</option>
                        </select>
                        <input
                            type="text"
                            name="gbValues"
                            className="flex-1 px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 text-sm shadow-sm"
                            placeholder="VD: 21 hoặc 31,11,21"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center">
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all transform hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                >
                    {isPending ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Đang phân tích...
                        </>
                    ) : (
                        <>
                            🚀 Bắt đầu Phân tích Nợ
                        </>
                    )}
                </button>
            </div>

            {lastUpdated && (
                <div className="mt-3 text-center">
                    <span className="text-xs text-gray-400">
                        Cập nhật lần cuối: {new Date(lastUpdated).toLocaleTimeString()}
                    </span>
                </div>
            )}
        </div>
    )
}
