'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import ReadingFiltersComponent from '@/components/readings/ReadingFilters'
import ReadingTable from '@/components/readings/ReadingTable'
import ReadingYearlyReport from '@/components/readings/ReadingYearlyReport'
import ReadingDotAnalysis from '@/components/readings/analysis/ReadingDotAnalysis'
import ReadingAnalysis from '@/components/readings/ReadingAnalysis'
import { getReadingData, ReadingFilters } from '@/app/readings/actions'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import { useEffect } from 'react'

export default function ReadingsPage() {
    const [tableData, setTableData] = useState<any[]>([])
    const [activeFilters, setActiveFilters] = useState<ReadingFilters | null>(null)
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [activeTab, setActiveTab] = useState<'detail' | 'team_analysis' | 'dot_analysis' | 'report'>('report')

    const handleSearch = async (filters: ReadingFilters) => {
        setLoading(true)
        setHasSearched(true)
        setActiveFilters(filters) // Store for highlighting/charts
        try {
            const data = await getReadingData(filters)
            setTableData(data)
        } catch (error) {
            console.error("Failed to load readings:", error)
        } finally {
            setLoading(false)
        }
    }

    const {
        canViewGhiTongQuan,
        canViewGhiChiTiet,
        canViewGhiToMay,
        canViewGhiDot
    } = usePermissions()

    const ALL_TABS = [
        { id: 'report', label: '📊 Biểu Đồ Tổng Quan', hasAccess: canViewGhiTongQuan },
        { id: 'detail', label: '📝 Tra Cứu Chi Tiết', hasAccess: canViewGhiChiTiet },
        { id: 'team_analysis', label: '🏭 Phân Tích Theo Tổ Máy', hasAccess: canViewGhiToMay },
        { id: 'dot_analysis', label: '🌊 Phân Tích Theo Đợt', hasAccess: canViewGhiDot },
    ]

    const tabs = ALL_TABS.filter(tab => tab.hasAccess)

    // Auto-select first available tab if current activeTab is not allowed or array just load
    useEffect(() => {
        if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id as any)
        }
    }, [tabs, activeTab])

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="w-full px-4 sm:px-6 lg:px-8 py-24">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">⏱️ Đọc Số</h1>
                    <p className="text-gray-500 mt-1">Quản lý và phân tích số liệu đọc số.</p>
                </div>

                {/* Main Tab Navigation */}
                {tabs.length > 0 ? (
                    <>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 inline-flex flex-wrap gap-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {activeTab === 'detail' && canViewGhiChiTiet && (
                                <>
                                    <div className="mb-6">
                                        <ReadingFiltersComponent onSearch={handleSearch} loading={loading} />
                                    </div>
                                    <ReadingTable data={tableData} loading={loading} hasSearched={hasSearched} />
                                </>
                            )}

                            {activeTab === 'team_analysis' && canViewGhiToMay && (
                                <div className="animate-in fade-in zoom-in-95 duration-300">
                                    <ReadingAnalysis />
                                </div>
                            )}

                            {activeTab === 'dot_analysis' && canViewGhiDot && (
                                <div className="animate-in fade-in zoom-in-95 duration-300">
                                    <ReadingDotAnalysis />
                                </div>
                            )}

                            {activeTab === 'report' && canViewGhiTongQuan && (
                                <ReadingYearlyReport />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                        Bạn không có quyền truy cập vào bất kỳ chức năng nào trong Đọc Số. Vui lòng liên hệ Admin.
                    </div>
                )}
            </main>
        </div>
    )
}
