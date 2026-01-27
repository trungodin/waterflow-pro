'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import ReadingFiltersComponent from '@/components/readings/ReadingFilters'
import ReadingTable from '@/components/readings/ReadingTable'
import ReadingAnalysis from '@/components/readings/ReadingAnalysis'
import ReadingYearlyReport from '@/components/readings/ReadingYearlyReport'
import { getReadingData, ReadingFilters } from '@/app/readings/actions'

export default function ReadingsPage() {
    const [tableData, setTableData] = useState<any[]>([])
    const [activeFilters, setActiveFilters] = useState<ReadingFilters | null>(null)
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [activeTab, setActiveTab] = useState<'detail' | 'analysis' | 'report'>('detail')

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

    const tabs = [
        { id: 'detail', label: '📝 Tra Cứu Chi Tiết' },
        { id: 'analysis', label: '📊 Phân Tích Số Liệu' }, // Renamed and New Component
        { id: 'report', label: '📅 Tổng Hợp Năm' },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="w-full px-4 sm:px-6 lg:px-8 py-24">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">✍️ Đọc Số (GHI)</h1>
                    <p className="text-gray-500 mt-1">Quản lý và phân tích số liệu đọc số.</p>
                </div>

                {/* Main Tab Navigation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 inline-flex flex-wrap gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                                activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] p-6">
                    {/* Filters - Hide when in Report OR Analysis tab */}
                    <div className={(activeTab === 'report' || activeTab === 'analysis') ? 'hidden' : 'block mb-6'}>
                        <ReadingFiltersComponent onSearch={handleSearch} loading={loading} />
                    </div>

                    {/* Tab Views */}
                    {activeTab === 'detail' && (
                        hasSearched ? (
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                <ReadingTable data={tableData} activeFilters={activeFilters} />
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                                <p className="text-gray-500 font-medium">Vui lòng chọn bộ lọc và bấm "Tải dữ liệu" để xem kết quả.</p>
                            </div>
                        )
                    )}

                    {activeTab === 'analysis' && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                             <ReadingAnalysis />
                        </div>
                    )}

                    {activeTab === 'report' && (
                        <ReadingYearlyReport />
                    )}
                </div>
            </main>
        </div>
    )
}
