'use client'

import { useState } from 'react'

interface AnalysisFiltersProps {
    onGenerate: (formData: FormData) => void
    isPending: boolean
}

export default function AnalysisFilters({ onGenerate, isPending }: AnalysisFiltersProps) {
    // Default dates: Start of month to today
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 shadow-sm">
            <form action={onGenerate} className="flex flex-wrap items-end gap-4">

                {/* Start Date */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                    <input
                        type="date"
                        name="startDate"
                        defaultValue={formatDate(startOfMonth)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                {/* End Date */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                    <input
                        type="date"
                        name="endDate"
                        defaultValue={formatDate(today)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                {/* Group Selector */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm / Đội</label>
                    <select
                        name="group"
                        defaultValue="Tất cả các nhóm"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="Tất cả các nhóm">Tất cả các nhóm</option>
                        <option value="TỔ 01">TỔ 01</option>
                        <option value="TỔ 02">TỔ 02</option>
                        <option value="TỔ 03">TỔ 03</option>
                        <option value="TỔ 04">TỔ 04</option>
                        <option value="TỔ 05">TỔ 05</option>
                        <option value="TỔ 06">TỔ 06</option>
                        <option value="TỔ 07">TỔ 07</option>
                        <option value="TỔ 08">TỔ 08</option>
                        {/* Add more groups if dynamic fetching is implemented later */}
                    </select>
                </div>

                {/* Submit Button */}
                <div className="mb-[1px]">
                    <button
                        type="submit"
                        disabled={isPending}
                        className={`px-6 py-2 rounded-md font-medium text-white shadow-sm transition-colors ${isPending
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }`}
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xử lý...
                            </span>
                        ) : (
                            '🔍 Phân Tích'
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
