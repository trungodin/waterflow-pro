'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import RevenueAnalysis from '@/components/RevenueAnalysis'
import AgentCollectionAnalysis from '@/components/AgentCollectionAnalysis'
import CollectionSummaryAnalysis from '@/components/CollectionSummaryAnalysis'
import GroupStatisticsAnalysis from '@/components/GroupStatisticsAnalysis'
import VirtualDMNTable from '@/components/VirtualDMNTable'
import LocDuLieuTon from '@/components/LocDuLieuTon'
import ThongKeDongMoNuoc from '@/components/ThongKeDongMoNuoc'
import { getOnOffData, getDriveImageLink } from '@/lib/googlesheets'
import LatenessAnalysisMain from '@/components/lateness-analysis/LatenessAnalysisMain'
import DebtAnalysisMain from '@/components/debt-analysis/DebtAnalysisMain'
import WeeklyReportMain from '@/components/weekly-report/WeeklyReportMain'
import { getDmnCache, setDmnCache, getDmnLocalCache, setDmnLocalCache } from '@/lib/dmn-cache'
import AddCustomerModal from '@/components/AddCustomerModal'
import MoNuocTab from '@/components/MoNuocTab'
import ThongBaoTab from '@/components/ThongBaoTab'

const MIGRATION_DONE = true
import Modal from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { generateProposalPDF } from '@/lib/utils/pdfGenerator'
import { uploadProposalAndSave } from './actions'


// Helper to get direct image URL (especially for Google Drive)
const getDirectImageUrl = (url: string) => {
  if (!url) return ''
  let cleanUrl = url.trim()

  // Ensure protocol if missing but looks like a URL
  if (!cleanUrl.match(/^https?:\/\//i) && (cleanUrl.match(/[\w-]+\.[\w-]+/) || cleanUrl.includes('drive'))) {
    cleanUrl = 'https://' + cleanUrl
  }

  // Comprehensive Google Drive ID extraction
  // Matches: /file/d/ID, id=ID, open?id=ID
  const idMatch = cleanUrl.match(/[-\w]{25,}/)
  if (cleanUrl.includes('drive.google.com') && idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[0]}&sz=w1000`
  }

  return cleanUrl
}

// Build URL /api/drive/image ngay tại client (không cần async server action)
function buildDriveProxyUrl(rawPath: string): string {
  if (!rawPath) return ''
  // Nếu đã là full URL (http/https) → trả thẳng
  if (rawPath.startsWith('http')) return rawPath
  // Strip AppSheet prefix
  let clean = rawPath
    .replace('database::database_Images/', 'database_Images/')
    .replace('database::ON_OFF_Images/', 'ON_OFF_Images/')
    .replace(/^database::/, '')
  // Thêm folder mặc định nếu chưa có
  if (!clean.includes('/')) clean = `database_Images/${clean}`
  return `/api/drive/image?path=${encodeURIComponent(clean)}`
}

// Helper to render Detail Row: Label - Value
const DetailRow = ({ label, value, isImage = false, isLink = false, className = '' }: { label: string, value: any, isImage?: boolean, isLink?: boolean, className?: string }) => {
  const [imgError, setImgError] = useState(false)

  // Reset lỗi khi value thay đổi
  useEffect(() => { setImgError(false) }, [value])

  // Ẩn nếu giá trị rỗng
  if (!value || value === '-' || value === '0' || value === 'Chưa xác định') return null

  const displayUrl = isImage ? buildDriveProxyUrl(value) : ''
  const openUrl = displayUrl || value

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement
    target.style.display = 'none'
    setImgError(true)
  }

  return (
    <div className={`flex flex-col border-b border-gray-100 py-3 last:border-0 ${className}`}>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 opacity-75">{label}</span>
      {isImage ? (
        <div className="mt-2 group relative inline-block min-h-[40px]">
          {displayUrl && !imgError ? (
            <img
              src={displayUrl}
              alt={label}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="rounded-lg border border-gray-200 shadow-sm max-h-72 w-full object-contain bg-gray-50 hover:bg-white transition-colors cursor-zoom-in"
              onClick={() => window.open(openUrl, '_blank')}
              onError={handleImageError}
            />
          ) : imgError ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm mt-1 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <span>↗ Mở ảnh trên Drive</span>
            </a>
          ) : (
            <span className="text-sm text-gray-400 italic">Không có ảnh</span>
          )}
        </div>
      ) : (
        <span className="text-base font-semibold text-gray-900 break-words leading-relaxed">{value}</span>
      )}
    </div>
  )
}

// Simple Metric Card Component
const MetricCard = ({ label, value, highlight = false, subValue }: { label: string, value: any, highlight?: boolean, subValue?: string }) => {
  if (!value || value === '0' || value === '-') return null
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} flex flex-col`}>
      <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${highlight ? 'text-red-500' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-lg font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</span>
      {subValue && <span className="text-xs text-gray-500 mt-1">{subValue}</span>}
    </div>
  )
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const { canViewDoanhThu, canViewDongMoNuoc, canViewTraCuuDMN, canViewMoNuoc, canViewThongBao } = usePermissions()

  // Evaluate default active tab based on permissions
  const defaultTab = canViewDoanhThu ? 'doanh_thu'
    : canViewDongMoNuoc ? 'dong_mo_nuoc'
      : canViewTraCuuDMN ? 'tra_cuu_dmn'
        : canViewMoNuoc ? 'mo_nuoc'
          : canViewThongBao ? 'thong_bao'
            : ''

  const [activeTab, setActiveTab] = useState(defaultTab)
  const [subTabDoanhThu, setSubTabDoanhThu] = useState('phan_tich_doanh_thu')
  const [subTabDMN, setSubTabDMN] = useState('loc_du_lieu_ton')

  // Refresh activeTab if permissions finish loading later
  useEffect(() => {
    if (!activeTab && defaultTab) {
      setActiveTab(defaultTab)
    }
  }, [defaultTab, activeTab])

  // Data states for Tra Cuu DMN
  const [dmnData, setDmnData] = useState<any[]>([])
  const [filteredDmnData, setFilteredDmnData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterDate, setFilterDate] = useState<string>('')
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)

  // State for Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const handleRowClick = (item: any) => {
    setSelectedCustomer(item)
  }

  const fetchData = async (forceRefresh = false) => {
    // Check if we already have data to show (stale data from localStorage)
    const hasStaleData = dmnData.length > 0

    if (hasStaleData && !forceRefresh) {
      // Silent background refresh — no loading spinner
      setIsBackgroundRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // 1. Try in-memory cache (15 min) if not forced
      if (!forceRefresh) {
        const cached = getDmnCache()
        if (cached) {
          setDmnData(cached)
          setFilteredDmnData(cached)
          setLastRefreshed(new Date())
          return
        }
      }

      // 2. Fetch from API
      const data = await getOnOffData()

      // 3. Save to both cache layers
      setDmnCache(data)
      setDmnLocalCache(data)

      setDmnData(data)
      setFilteredDmnData(data)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Error fetching ON_OFF data:', error)
      if (!hasStaleData) {
        alert('Có lỗi khi tải dữ liệu từ Google Sheets')
      }
    } finally {
      setLoading(false)
      setIsBackgroundRefreshing(false)
    }
  }

  const handleCreateProposal = async () => {
    if (!selectedCustomer) return

    // Confirm upload only
    if (!confirm(`Tạo đề nghị cho khách hàng ${selectedCustomer.TenKH}?\n(File sẽ được lưu vào hệ thống)`)) return

    setIsGenerating(true)
    try {
      // 1. Generate PDF Blob (download=false: Only upload to server)
      const result = await generateProposalPDF(selectedCustomer, false)

      if (result.success && result.pdfBlob) {
        // 2. Upload to Server
        const formData = new FormData()
        formData.append('file', result.pdfBlob, result.fileName)
        formData.append('fileName', result.fileName)
        formData.append('idTB', selectedCustomer.IdTB || '') // Ensure IdTB exists

        // No dynamic import needed if static import is used
        // const { uploadProposalAndSave } = await import('./actions')
        const uploadRes = await uploadProposalAndSave(formData)

        if (uploadRes.success) {
          alert(`✅ Đã tạo và lưu file thành công!\nLink: ${uploadRes.url}`)

          const newUrl = uploadRes.url
          setSelectedCustomer((prev: any) => ({ ...prev, FileCpmn: newUrl, NgayCpmn: uploadRes.ngay_cpmn, TgCpmn: uploadRes.tg_cpmn }))
          setDmnData(prev => prev.map(item => item.IdTB === selectedCustomer.IdTB ? { ...item, FileCpmn: newUrl, NgayCpmn: uploadRes.ngay_cpmn, TgCpmn: uploadRes.tg_cpmn } : item))
        } else {
          alert(`⚠️ Đã tải file về máy, nhưng lỗi lưu hệ thống: ${uploadRes.error}`)
        }

      } else {
        alert(`Lỗi khi tạo file: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating proposal:', error)
      alert('Đã xảy ra lỗi không mong muốn.')
    } finally {
      setIsGenerating(false)
    }
  }





  // On mount: load localStorage instantly (stale-while-revalidate)
  useEffect(() => {
    const localData = getDmnLocalCache()
    if (localData && localData.length > 0) {
      setDmnData(localData)
      setFilteredDmnData(localData)
    }
  }, [])

  // When tab becomes active: trigger background refresh
  useEffect(() => {
    if (activeTab === 'tra_cuu_dmn') {
      // Always refresh in background — stale data already shown from localStorage
      fetchData(false)
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
    const lowerTerm = debouncedSearchTerm.toLowerCase().trim()
    const targetDate = filterDate
    const targetStatus = filterStatus // ALL, LOCKED, OPEN

    const filtered = dmnData.filter(item => {
      // 1. Text Search Filter
      const fullAddress = `${item.SoNha} ${item.Duong}`.toLowerCase()
      const matchesText = !lowerTerm || (
        (item.DanhBa && item.DanhBa.toLowerCase().includes(lowerTerm)) ||
        (item.TenKH && item.TenKH.toLowerCase().includes(lowerTerm)) ||
        (item.SoNha && item.SoNha.toLowerCase().includes(lowerTerm)) ||
        (item.Duong && item.Duong.toLowerCase().includes(lowerTerm)) ||
        (item.MLT2 && item.MLT2.toLowerCase().includes(lowerTerm)) ||
        (fullAddress.includes(lowerTerm))
      )

      if (!matchesText) return false

      // 2. Status Filter
      let matchesStatus = true
      const statusRaw = (item.TinhTrang || '').toLowerCase()
      // Normalize to handle potential unicode variations if needed, but simple includes usually works
      // Check for both accented and non-accented just in case
      if (targetStatus === 'LOCKED') {
        matchesStatus = statusRaw.includes('khóa') || statusRaw.includes('khoá') || statusRaw.includes('khoa')
      } else if (targetStatus === 'OPEN') {
        matchesStatus = statusRaw.includes('mở') || statusRaw.includes('mo') || statusRaw.includes('bình thường')
      }

      if (!matchesStatus) return false

      // 3. Date Filter
      if (targetDate) {
        // Parse dd/mm/yyyy or d/m/yyyy from data to yyyy-MM-dd
        const parseDmnDate = (dStr: string) => {
          if (!dStr) return ''
          // Handle various separators
          const cleanStr = dStr.trim().split(' ')[0] // Remove time "14/02/2025 10:00:00"
          if (cleanStr.includes('/')) {
            const parts = cleanStr.split('/')
            if (parts.length === 3) {
              // Ensure padding: 1/2/2026 -> 01/02/2026 -> 2026-02-01
              const day = parts[0].padStart(2, '0')
              const month = parts[1].padStart(2, '0')
              const year = parts[2]
              return `${year}-${month}-${day}`
            }
          }
          return ''
        }

        const dateKhoa = parseDmnDate(item.NgayKhoa)
        const dateMo = parseDmnDate(item.NgayMo)

        if (targetStatus === 'LOCKED') {
          if (dateKhoa !== targetDate) return false
        } else if (targetStatus === 'OPEN') {
          if (dateMo !== targetDate) return false
        } else {
          // ALL status selected but Date provided -> Check BOTH
          if (dateKhoa !== targetDate && dateMo !== targetDate) return false
        }
      }

      return true
    })
    setFilteredDmnData(filtered)
  }, [debouncedSearchTerm, dmnData, filterStatus, filterDate])

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
          {canViewDoanhThu && (
            <button
              onClick={() => setActiveTab('doanh_thu')}
              className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'doanh_thu'
                ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                } active:shadow-none active:translate-y-[1px]`}
            >
              💰 Doanh Thu
            </button>
          )}
          {canViewDongMoNuoc && (
            <button
              onClick={() => setActiveTab('dong_mo_nuoc')}
              className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'dong_mo_nuoc'
                ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                } active:shadow-none active:translate-y-[1px]`}
            >
              💧 Đóng Mở Nước
            </button>
          )}
          {canViewTraCuuDMN && (
            <button
              onClick={() => setActiveTab('tra_cuu_dmn')}
              className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'tra_cuu_dmn'
                ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                } active:shadow-none active:translate-y-[1px]`}
            >
              🔍 Tra Cứu ĐMN
            </button>
          )}
          {canViewMoNuoc && (
            <button
              onClick={() => setActiveTab('mo_nuoc')}
              className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'mo_nuoc'
                ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                } active:shadow-none active:translate-y-[1px]`}
            >
              💧 Mở Nước
            </button>
          )}
          {canViewThongBao && (
            <button
              onClick={() => setActiveTab('thong_bao')}
              className={`px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'thong_bao'
                ? 'bg-blue-600 text-white shadow-[0_3px_0_rgb(29,78,216)] translate-y-[-2px]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                } active:shadow-none active:translate-y-[1px]`}
            >
              📢 Thông Báo
            </button>
          )}
        </div>


        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] p-6">
          {!activeTab && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-xl font-medium">Bạn không có quyền truy cập các chức năng trong trang này.</p>
              <p className="mt-2 text-sm">Vui lòng liên hệ Admin để xin cấp quyền.</p>
            </div>
          )}



          {/* TAB: DOANH THU */}
          {activeTab === 'doanh_thu' && canViewDoanhThu && (
            <div>
              <div className="flex gap-4 border-b border-gray-200 pb-4 mb-6 overflow-x-auto">
                {[
                  { id: 'phan_tich_doanh_thu', label: 'Phân tích Doanh thu' },
                  { id: 'phan_tich_thu_ho', label: 'Đăng ngân' },
                  { id: 'tong_hop_thu_ho', label: 'Ngân hàng thu hộ' },
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
          {activeTab === 'dong_mo_nuoc' && canViewDongMoNuoc && (
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

          {/* TAB: MỞ NƯỚC */}
          {activeTab === 'mo_nuoc' && canViewMoNuoc && (
            <MoNuocTab />
          )}

          {/* TAB: THÔNG BÁO */}
          {activeTab === 'thong_bao' && canViewThongBao && (
            <ThongBaoTab />
          )}

          {/* TAB: TRA CỨU ĐMN */}
          {activeTab === 'tra_cuu_dmn' && canViewTraCuuDMN && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="w-full md:w-2/3 flex gap-2">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm kiếm MLT, danh bạ, tên, địa chỉ..."
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
                  <div className='flex gap-2 items-center'>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-700 bg-white"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="LOCKED">Đang Khóa</option>
                      <option value="OPEN">Đã Mở</option>
                    </select>

                    <div className="relative">
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-700 hover:cursor-pointer [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      {filterDate && (
                        <button
                          onClick={() => setFilterDate('')}
                          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Xóa chọn ngày"
                          style={{ right: '2.5rem' }} // Adjust based on calendar icon width usually (~20px-30px)
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>



                    <button
                      onClick={() => fetchData(true)}
                      disabled={loading || isBackgroundRefreshing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-bold whitespace-nowrap disabled:opacity-70 flex items-center gap-2 shadow-[0_3px_0_rgb(29,78,216)] active:shadow-none active:translate-y-[3px] transition-all"
                    >
                      {loading ? 'Đang tải...' : '🔄 Làm mới'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 font-bold whitespace-nowrap flex items-center gap-2 shadow-[0_3px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[3px] transition-all"
                  >
                    ➕ Thêm KH
                  </button>
                  <div className="text-sm text-gray-500 text-right">
                    {isBackgroundRefreshing && (
                      <span className="flex items-center gap-1 text-blue-500">
                        <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                        Đang cập nhật...
                      </span>
                    )}
                    {!isBackgroundRefreshing && lastRefreshed && (
                      <span>Cập nhật: {lastRefreshed.toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              </div>


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
                  onRowClick={handleRowClick}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title=""
        width="max-w-4xl"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* 1. Header: Customer Identity */}
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2 text-lg text-gray-900 font-bold">
                  <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">
                    🔢 {selectedCustomer.DanhBa}
                  </span>
                  <span className="flex items-center gap-1.5">
                    🏠 {selectedCustomer.SoNha} {selectedCustomer.Duong}
                  </span>
                </div>
                <h2 className="text-base font-medium text-gray-600">{selectedCustomer.TenKH}</h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Action Buttons */}
                {selectedCustomer.FileCpmn && (
                  <a
                    href={selectedCustomer.FileCpmn.startsWith('http') ? selectedCustomer.FileCpmn : `/api/drive/image?path=${encodeURIComponent(selectedCustomer.FileCpmn)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-sm"
                    title="Xem phiếu đề nghị"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </a>
                )}

                {!selectedCustomer.FileCpmn && (
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm hover:shadow active:scale-95 transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleCreateProposal}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )}
                    {isGenerating ? 'Đang tạo...' : 'Đề nghị'}
                  </button>
                )}

                {/* Status Badge */}
                <div className={`px-5 py-2 rounded-lg font-bold text-sm whitespace-nowrap shadow-sm border ${selectedCustomer.TinhTrang?.toLowerCase().includes('mở')
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-red-100 text-red-700 border-red-200'
                  }`}>
                  {selectedCustomer.TinhTrang || 'Chưa xác định'}
                </div>
              </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Tổng Nợ" value={selectedCustomer.TongNo ? `${formatCurrency(selectedCustomer.TongNo)} VNĐ` : null} highlight={true} />
              <MetricCard label="Tổng Kỳ" value={selectedCustomer.TongKy ? `${selectedCustomer.TongKy} kỳ` : null} />
              <MetricCard label="Nhóm Khóa" value={selectedCustomer.NhomKhoa} />
              <MetricCard label="Kiểu Khóa" value={selectedCustomer.KieuKhoa} />
            </div>

            {/* 3. Billing Period (Moved Up) */}
            {selectedCustomer.KyNam && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Kỳ Năm (Chi tiết nợ)</span>
                <div className="text-sm font-medium text-gray-900">{selectedCustomer.KyNam}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 3. Locking Details */}
              {(selectedCustomer.NgayKhoa || selectedCustomer.HinhKhoa) && (
                <div className="border border-gra-200 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Thông tin Khóa</h3>
                  </div>
                  <div className="p-4 space-y-2 flex-grow bg-white">
                    <DetailRow label="Ngày Khóa" value={selectedCustomer.NgayKhoa} />
                    <DetailRow label="Hình Khóa" value={selectedCustomer.HinhKhoa} isImage />
                  </div>
                </div>
              )}

              {/* 4. Opening Details */}
              {(selectedCustomer.NgayMo || selectedCustomer.HinhMo || selectedCustomer.GhiChuMo || selectedCustomer.NvMo) && (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Thông tin Mở</h3>
                  </div>
                  <div className="p-4 space-y-2 flex-grow bg-white">
                    <DetailRow label="Ngày Mở" value={selectedCustomer.NgayMo} />
                    <DetailRow label="NV Mở" value={selectedCustomer.NvMo} />
                    <DetailRow label="Ghi Chú" value={selectedCustomer.GhiChuMo} />
                    <DetailRow label="Hình Mở" value={selectedCustomer.HinhMo} isImage />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Additional Notices */}
            {(selectedCustomer.NgayTb || selectedCustomer.HinhTb) && (
              <div className="border-t border-gray-100 pt-6 mt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Thông báo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <DetailRow label="Ngày Thông Báo" value={selectedCustomer.NgayTb} />
                    <DetailRow label="Hình Thông Báo" value={selectedCustomer.HinhTb} isImage />
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 mt-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-lg -mx-4 -mb-4">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-bold shadow-sm transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        )
        }
      </Modal >

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={() => fetchData(true)}
      />
    </div >
  )
}
