'use client'

import { useState, useEffect, Fragment } from 'react'
import Navbar from '@/components/Navbar'
import RevenueAnalysis from '@/components/RevenueAnalysis'
import AgentCollectionAnalysis from '@/components/AgentCollectionAnalysis'
import CollectionSummaryAnalysis from '@/components/CollectionSummaryAnalysis'
import GroupStatisticsAnalysis from '@/components/GroupStatisticsAnalysis'
import VirtualDMNTable from '@/components/VirtualDMNTable'
import LocDuLieuTon from '@/components/LocDuLieuTon'
import ThongKeDongMoNuoc from '@/components/ThongKeDongMoNuoc'
import { getOnOffData } from '@/lib/googlesheets'
import LatenessAnalysisMain from '@/components/lateness-analysis/LatenessAnalysisMain'
import DebtAnalysisMain from '@/components/debt-analysis/DebtAnalysisMain'
import WeeklyReportMain from '@/components/weekly-report/WeeklyReportMain'

import Modal from '@/components/ui/Modal'


// Format currency
const formatCurrency = (val: string | number) => {
  if (!val) return '0'
  const num = typeof val === 'string' ? parseFloat(val.replace(/[.,]/g, '')) : val
  if (isNaN(num)) return val
  return new Intl.NumberFormat('vi-VN').format(num)
}



export default function PaymentsPage() {

  const [activeTab, setActiveTab] = useState('doanh_thu')
  const [subTabDoanhThu, setSubTabDoanhThu] = useState('phan_tich_doanh_thu')
  const [subTabDMN, setSubTabDMN] = useState('loc_du_lieu_ton')

  // Data states for Tra Cuu DMN
  const [dmnData, setDmnData] = useState<any[]>([])
  const [filteredDmnData, setFilteredDmnData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Fetch data function
  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await getOnOffData()
      setDmnData(data)
      setFilteredDmnData(data)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Error fetching ON_OFF data:', error)
      alert('Có lỗi khi tải dữ liệu từ Google Sheets')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch when tab is active
  useEffect(() => {
    if (activeTab === 'tra_cuu_dmn' && dmnData.length === 0) {
      fetchData()
    }
  }, [activeTab])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filter logic based on debounced term
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setFilteredDmnData(dmnData)
      return
    }

    const lowerTerm = debouncedSearchTerm.toLowerCase().trim()
    const filtered = dmnData.filter(item => {
      // Support combined search: "156 hai" -> matches "156" (SoNha) + "HAI BA TRUNG" (Duong)
      const fullAddress = `${item.SoNha} ${item.Duong}`.toLowerCase()

      return (
        (item.DanhBa && item.DanhBa.toLowerCase().includes(lowerTerm)) ||
        (item.TenKH && item.TenKH.toLowerCase().includes(lowerTerm)) ||
        (item.SoNha && item.SoNha.toLowerCase().includes(lowerTerm)) ||
        (item.Duong && item.Duong.toLowerCase().includes(lowerTerm)) ||
        (fullAddress.includes(lowerTerm)) // Combined address search
      )
    })
    setFilteredDmnData(filtered)
  }, [debouncedSearchTerm, dmnData])

  // Group data by NgayKhoa
  const groupedData = filteredDmnData.reduce((acc, item) => {
    // Normalizing date for grouping (take first part if contains space)
    let dateKey = item.NgayKhoa || 'Chưa xác định'
    if (dateKey.includes(' ')) dateKey = dateKey.split(' ')[0]

    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(item)
    return acc
  }, {} as Record<string, any[]>)

  // Sort dates desc
  const sortedDates = Object.keys(groupedData).sort((a, b) => {
    const parseDate = (d: string) => {
      if (d === 'Chưa xác định') return 0
      const parts = d.split('/')
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime()
      return 0
    }
    return parseDate(b) - parseDate(a)
  })

  // Calculate total debt for filtered list
  const totalDebtFiltered = filteredDmnData.reduce((sum, item) => {
    const val = parseFloat(String(item.TongNo).replace(/[.,]/g, ''))
    return sum + (isNaN(val) ? 0 : val)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💳 Thu Tiền</h1>
          <p className="text-gray-500 mt-1">Quản lý doanh thu, đóng mở nước và tra cứu thông tin.</p>
        </div>

        {/* Main Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 inline-flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('doanh_thu')}
            className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'doanh_thu'
              ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              } active:shadow-none active:translate-y-[1px]`}
          >
            💰 Doanh Thu
          </button>
          <button
            onClick={() => setActiveTab('dong_mo_nuoc')}
            className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'dong_mo_nuoc'
              ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              } active:shadow-none active:translate-y-[1px]`}
          >
            💧 Đóng Mở Nước
          </button>
          <button
            onClick={() => setActiveTab('tra_cuu_dmn')}
            className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'tra_cuu_dmn'
              ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              } active:shadow-none active:translate-y-[1px]`}
          >
            🔍 Tra Cứu ĐMN
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] p-6">



          {/* TAB: DOANH THU */}
          {activeTab === 'doanh_thu' && (
            <div>
              <div className="flex gap-4 border-b border-gray-200 pb-4 mb-6 overflow-x-auto">
                {[
                  { id: 'phan_tich_doanh_thu', label: 'Phân tích Doanh thu' },
                  { id: 'phan_tich_thu_ho', label: 'Đăng ngân ngày' },
                  { id: 'tong_hop_thu_ho', label: 'Tổng hợp Ngân hàng Thu hộ' },
                  { id: 'thong_ke_nhom', label: 'Thống kê theo Nhóm' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSubTabDoanhThu(tab.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTabDoanhThu === tab.id
                      ? 'bg-blue-100 text-blue-700 shadow-[0_2px_0_rgb(191,219,254)] translate-y-[-1px]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      } active:shadow-none active:translate-y-[1px]`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {subTabDoanhThu === 'phan_tich_doanh_thu' ? (
                <RevenueAnalysis />
              ) : subTabDoanhThu === 'phan_tich_thu_ho' ? (
                <AgentCollectionAnalysis />
              ) : subTabDoanhThu === 'tong_hop_thu_ho' ? (
                <CollectionSummaryAnalysis />
              ) : subTabDoanhThu === 'thong_ke_nhom' ? (
                <GroupStatisticsAnalysis />
              ) : (
                <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <p className="text-xl">Chức năng <b>{subTabDoanhThu}</b> đang được phát triển.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: ĐÓNG MỞ NƯỚC */}
          {activeTab === 'dong_mo_nuoc' && (
            <div>
              <div className="flex gap-4 border-b border-gray-200 pb-4 mb-6 overflow-x-auto">
                {[
                  { id: 'loc_du_lieu_ton', label: 'Lọc dữ liệu tồn' },
                  { id: 'bao_cao_tuan', label: 'Báo cáo tuần' },
                  { id: 'phan_tich_hd_no', label: 'Phân tích Hóa đơn nợ' },
                  { id: 'phan_tich_thanh_toan', label: 'Phân tích Thanh toán' },
                  { id: 'thong_ke_dmn', label: 'Thống kê Đóng Mở Nước' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSubTabDMN(tab.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTabDMN === tab.id
                      ? 'bg-blue-100 text-blue-700 shadow-[0_2px_0_rgb(191,219,254)] translate-y-[-1px]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      } active:shadow-none active:translate-y-[1px]`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {subTabDMN === 'loc_du_lieu_ton' ? (
                <div className="h-full">
                  <LocDuLieuTon formatCurrency={formatCurrency} />
                </div>
              ) : subTabDMN === 'bao_cao_tuan' ? (
                <WeeklyReportMain />
              ) : subTabDMN === 'thong_ke_dmn' ? (
                <div className="h-full">
                  <ThongKeDongMoNuoc formatCurrency={formatCurrency} />
                </div>
              ) : subTabDMN === 'phan_tich_hd_no' ? (
                <DebtAnalysisMain />
              ) : subTabDMN === 'phan_tich_thanh_toan' ? (
                <LatenessAnalysisMain />
              ) : (
                <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <p className="text-xl">Chức năng <b>{subTabDMN}</b> đang được phát triển.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: TRA CỨU ĐMN */}
          {activeTab === 'tra_cuu_dmn' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="w-full md:w-2/3 flex gap-2">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm kiếm danh bạ, tên, địa chỉ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400 font-medium"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-bold whitespace-nowrap disabled:opacity-70 flex items-center gap-2 shadow-[0_3px_0_rgb(29,78,216)] active:shadow-none active:translate-y-[3px] transition-all"
                  >
                    {loading ? 'Đang tải...' : '🔄 Làm mới'}
                  </button>
                </div>
                <div className="text-sm text-gray-500 text-right">
                  {lastRefreshed && <span>Cập nhật: {lastRefreshed.toLocaleTimeString()}</span>}
                </div>
              </div>

              {/* Summary Stats */}
              {filteredDmnData.length > 0 && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg flex flex-wrap gap-6 text-sm border border-blue-100">
                  <div className="text-blue-800">
                    <span className="font-semibold">Tổng số:</span> {filteredDmnData.length} KH
                  </div>
                  <div className="text-blue-800">
                    <span className="font-semibold">Tổng nợ:</span> {new Intl.NumberFormat('vi-VN').format(totalDebtFiltered)} VNĐ
                  </div>
                </div>
              )}

              {/* Data Table */}
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-gray-500">Đang tải dữ liệu...</p>
                </div>
              ) : (
                <VirtualDMNTable
                  data={filteredDmnData}
                  searchTerm={searchTerm}
                  formatCurrency={formatCurrency}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
