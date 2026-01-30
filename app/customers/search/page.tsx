'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { 
  searchCustomers, 
  getCustomerDetails,
  getPaymentHistory,
  getGBValues,
  getCoValues,
  type Customer,
  type CustomerDetail,
  type CustomerSearchParams
} from '@/app/actions/customers'

export default function CustomerSearchPage() {
  // Form states
  const [danhba, setDanhba] = useState('')
  const [tenkh, setTenkh] = useState('')
  const [diaChi, setDiaChi] = useState('')
  const [mlt2, setMlt2] = useState('')
  const [sdt, setSdt] = useState('')
  const [sothan, setSothan] = useState('')
  const [gb, setGb] = useState('Tất cả')
  const [tongNo, setTongNo] = useState('')
  const [tienHd, setTienHd] = useState('')
  const [co, setCo] = useState('Tất cả')
  const [soBienLai, setSoBienLai] = useState('')

  // Data states
  const [gbOptions, setGbOptions] = useState<string[]>(['Tất cả'])
  const [coOptions, setCoOptions] = useState<string[]>(['Tất cả'])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [customerDetails, setCustomerDetails] = useState<Map<string, CustomerDetail>>(new Map())
  const [paymentHistories, setPaymentHistories] = useState<Map<string, any[]>>(new Map())
  const [historyPages, setHistoryPages] = useState<Map<string, number>>(new Map())

  const ITEMS_PER_PAGE = 24
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())

  // Load GB and Co options on mount
  useEffect(() => {
    const loadOptions = async () => {
      const [gbVals, coVals] = await Promise.all([
        getGBValues(),
        getCoValues()
      ])
      setGbOptions(gbVals)
      setCoOptions(coVals)
    }
    loadOptions()
  }, [])

  const handleSearch = async () => {
    // Check if at least one field is filled
    const hasAnyFilter = 
      danhba.trim() || 
      tenkh.trim() || 
      diaChi.trim() || 
      mlt2.trim() || 
      sdt.trim() || 
      sothan.trim() || 
      (gb && gb !== 'Tất cả') || 
      tongNo.trim() || 
      tienHd.trim() || 
      (co && co !== 'Tất cả') || 
      soBienLai.trim()

    if (!hasAnyFilter) {
      alert('Vui lòng nhập ít nhất một thông tin để tìm kiếm.')
      return
    }

    setLoading(true)
    setSearched(true)
    setSelectedCustomers(new Set())
    setCustomerDetails(new Map())
    setPaymentHistories(new Map())
    
    try {
      const params: CustomerSearchParams = {
        danhba: danhba.trim() || undefined,
        tenkh: tenkh.trim() || undefined,
        dia_chi: diaChi.trim() || undefined,
        mlt2: mlt2.trim() || undefined,
        sdt: sdt.trim() || undefined,
        sothan: sothan.trim() || undefined,
        gb: (gb && gb !== 'Tất cả') ? gb : undefined,
        tong_no: tongNo.trim() || undefined,
        tien_hd: tienHd.trim() || undefined,
        co: (co && co !== 'Tất cả') ? co : undefined,
        so_bien_lai: soBienLai.trim() || undefined
      }
      
      console.log('Search params:', params)
      
      const results = await searchCustomers(params)
      console.log('Search results:', results)
      
      setCustomers(results)
    } catch (error) {
      console.error('Search error:', error)
      alert('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCustomer = (danhBa: string | number) => {
    const danhBaStr = String(danhBa)
    
    // 1. Update UI Selection State Immediately (Non-blocking)
    setSelectedCustomers(prev => {
        const newSelected = new Set(prev)
        if (newSelected.has(danhBaStr)) {
            newSelected.delete(danhBaStr)
        } else {
            newSelected.add(danhBaStr)
        }
        return newSelected
    })

    // 2. Fetch Data Asynchronously (Fire and Forget or Effect-like)
    // Only fetch if we are SELECTING (not deselecting) and data is missing
    // We check against 'selectedCustomers' current state in a functional way, 
    // but here we know the intent is toggling. 
    // Better logic: Check if we are adding it.
    
    // Since setState is async, we can't rely on 'selectedCustomers' updated value here immediately.
    // So we replicate the check logic locally.
    const isCurrentlySelected = selectedCustomers.has(danhBaStr)
    const willBeSelected = !isCurrentlySelected

    if (willBeSelected && !customerDetails.has(danhBaStr)) {
        // Trigger fetch in background
        fetchCustomerDetails(danhBaStr)
    }
  }

  const fetchCustomerDetails = async (danhBaStr: string) => {
      // Prevent duplicate fetches if user clicks rapidly
      if (loadingDetails.has(danhBaStr)) return

      setLoadingDetails(prev => new Set(prev).add(danhBaStr))
      try {
          console.log('[fetchCustomerDetails] Loading details for:', danhBaStr)
          const details = await getCustomerDetails(danhBaStr)
          
          if (details) {
            setCustomerDetails(prev => new Map(prev).set(danhBaStr, details))
          } else {
            console.error('[fetchCustomerDetails] No details returned')
            alert(`Không thể tải thông tin chi tiết cho danh bạ ${danhBaStr}`)
            // Start rollback selection if needed, but usually keeping it selected with error is better UX than auto-deselect
          }
      } catch (error) {
          console.error('[fetchCustomerDetails] Error loading details:', error)
          alert(`Lỗi khi tải chi tiết: ${error}`)
      } finally {
          setLoadingDetails(prev => {
            const newSet = new Set(prev)
            newSet.delete(danhBaStr)
            return newSet
          })
      }
  }

  const loadPaymentHistory = async (danhBa: string) => {
    try {
      const history = await getPaymentHistory(danhBa)
      setPaymentHistories(prev => new Map(prev).set(danhBa, history))
    } catch (error) {
      console.error('Error loading payment history:', error)
    }
  }

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val)
  }

  const formatCurrencyWithVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ'
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatDanhBa = (danhBa: string | number) => {
    return String(danhBa).padStart(11, '0')
  }

  const formatMLT = (mlt: string | number | null | undefined) => {
    if (!mlt) return ''
    return String(mlt).padStart(9, '0')
  }

  const formatSDT = (sdt: string | number | null | undefined) => {
    if (!sdt) return ''
    return String(sdt).padStart(10, '0')
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A'
    try {
      // Check if already in dd/mm/yyyy or dd-mm-yyyy format
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(dateStr)) {
        const parts = dateStr.split(/[/-]/)
        const day = parts[0].padStart(2, '0')
        const month = parts[1].padStart(2, '0')
        const year = parts[2]
        return `${day}-${month}-${year}`
      }
      
      // Try parsing as ISO date
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return dateStr // Return original if can't parse
      }
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return dateStr
      }
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    } catch {
      return dateStr || ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Global styles for placeholder and input text */}
      <style jsx global>{`
        input::placeholder,
        select::placeholder {
          color: #6B7280 !important;
          font-weight: 400 !important;
          opacity: 1 !important;
        }
        
        input,
        select {
          color: #111827 !important;
          font-weight: 500 !important;
        }
        
        input:focus,
        select:focus {
          color: #000000 !important;
        }
      `}</style>
      
      <main className="w-full px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600 rounded-lg shadow-lg">
              <span className="text-3xl">🔎</span>
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-cyan-600">
              Tra cứu Thông tin Khách hàng
            </h1>
          </div>
          <p className="text-gray-600 ml-16 text-lg font-medium">Nhập thông tin bên dưới rồi nhấn <span className="text-blue-700 font-bold">'Tìm kiếm'</span>. Sau đó, tích vào ô <span className="text-blue-700 font-bold">'Xem'</span> để xem chi tiết.</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-xl border-t-4 border-blue-600 p-8 mb-10 ring-1 ring-gray-200/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Danh bạ</label>
              <input
                type="text"
                value={danhba}
                onChange={(e) => setDanhba(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Tên Khách hàng</label>
              <input
                type="text"
                value={tenkh}
                onChange={(e) => setTenkh(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Địa chỉ (VD: 285 Võ Văn Tần)</label>
              <input
                type="text"
                value={diaChi}
                onChange={(e) => setDiaChi(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="285 Võ Văn Tần"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Mã lộ trình (MLT2)</label>
              <input
                type="text"
                value={mlt2}
                onChange={(e) => setMlt2(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Số điện thoại</label>
              <input
                type="text"
                value={sdt}
                onChange={(e) => setSdt(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Số thân đồng hồ</label>
              <input
                type="text"
                value={sothan}
                onChange={(e) => setSothan(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Giá biểu (GB)</label>
              <select
                value={gb}
                onChange={(e) => setGb(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm cursor-pointer"
              >
                {gbOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Cỡ ĐH</label>
              <select
                value={co}
                onChange={(e) => setCo(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm cursor-pointer"
              >
                {coOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Tổng nợ (VNĐ)</label>
              <input
                type="text"
                value={tongNo}
                onChange={(e) => setTongNo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập số tiền nợ..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Tiền hóa đơn (VNĐ)</label>
              <input
                type="text"
                value={tienHd}
                onChange={(e) => setTienHd(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập số tiền hóa đơn..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Số biên lai</label>
              <input
                type="text"
                value={soBienLai}
                onChange={(e) => setSoBienLai(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="VD: 339/5"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-400 font-semibold shadow-sm"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  <span>Đang tìm kiếm...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Tìm kiếm</span>
                </>
              )}
            </button>
            {searched && (
              <button
                onClick={() => {
                  setDanhba('')
                  setTenkh('')
                  setDiaChi('')
                  setMlt2('')
                  setSdt('')
                  setSothan('')
                  setGb('Tất cả')
                  setTongNo('')
                  setTienHd('')
                  setCo('Tất cả')
                  setSoBienLai('')
                  setCustomers([])
                  setSearched(false)
                }}
                className="px-8 py-3.5 bg-white border-2 border-red-100 text-red-600 font-bold text-lg rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-700 hover:shadow-md transition-all duration-200 flex items-center gap-2"
              >
                <span>🗑️</span>
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <span>📋</span>
                Kết quả tìm kiếm
              </h2>
               {customers.length > 0 && (
                  <span className="text-sm font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full border border-blue-200 shadow-sm">
                    {customers.length} khách hàng
                  </span>
                )}
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Đang tìm kiếm...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">Không tìm thấy khách hàng nào</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-700 text-white shadow-md">
                      <tr>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider border-r border-blue-600 w-16">Xem</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">Danh bạ</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">MLT2</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">Tên KH</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">Số nhà</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">Đường</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">SDT</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">Số thân</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">Hiệu ĐH</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-600">Cỡ ĐH</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">GB</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customers.map((customer) => (
                        <tr key={customer.DanhBa} className={`transition-colors border-b border-blue-100 ${selectedCustomers.has(String(customer.DanhBa)) ? 'bg-blue-100 hover:bg-blue-200' : 'odd:bg-white even:bg-blue-50/50 hover:bg-blue-100'}`}>
                          <td className="px-6 py-4 text-center border-r border-blue-100">
                            <input
                              type="checkbox"
                              checked={selectedCustomers.has(String(customer.DanhBa))}
                              onChange={() => toggleCustomer(customer.DanhBa)}
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shadow-sm"
                            />
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-sm text-blue-900 border-r border-blue-100">{formatDanhBa(customer.DanhBa)}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 border-r border-blue-100">{formatMLT(customer.MLT2)}</td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900 border-r border-blue-100">{customer.TenKH}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 border-r border-blue-100">{customer.So}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 border-r border-blue-100">{customer.Duong}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 border-r border-blue-100">{formatSDT(customer.SDT)}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 border-r border-blue-100">{customer.SoThan || ''}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 border-r border-blue-100">{customer.Hieu || ''}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 border-r border-blue-100">{customer.Co || ''}</td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-800">{customer.GB}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Customer Details */}
                {Array.from(selectedCustomers).map(danhBa => {
                  const details = customerDetails.get(danhBa)
                  const isLoading = loadingDetails.has(danhBa)
                  const history = paymentHistories.get(danhBa)

                  return (
                    <div key={danhBa} className="border-t-4 border-blue-500 bg-white p-8 shadow-inner animate-in fade-in zoom-in-95 duration-300">
                      {isLoading ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                          <p className="mt-3 text-blue-600 font-bold animate-pulse">Đang tải chi tiết...</p>
                        </div>
                      ) : details ? (
                        <div className="bg-white rounded-xl">
                          <div className="flex justify-between items-start mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-2xl shadow-lg border border-blue-400">
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                  <span className="text-2xl drop-shadow-md">🏠</span>
                                  <h3 className="text-2xl font-black text-white tracking-tight font-mono drop-shadow-md">{formatDanhBa(details.DanhBa)}</h3>
                               </div>
                              <div className="flex items-center gap-2 text-blue-50 pl-1">
                                <span className="text-lg font-medium">{details.So} {details.Duong}</span>
                              </div>
                              <p className="font-extrabold text-white text-xl mt-2 drop-shadow-md">{details.TenKH}</p>
                            </div>
                            <button
                              onClick={() => loadPaymentHistory(danhBa)}
                              className="px-6 py-3 bg-white text-blue-700 rounded-xl hover:bg-blue-50 font-bold shadow-lg transition-all flex items-center gap-2 border border-white/50"
                            >
                              <span>💰</span> Kiếm tra thanh toán
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-6 mb-4">
                            <div className="space-y-2">
                              <p className="text-blue-600"><span className="font-medium">Số điện thoại:</span> <span className="text-gray-900">{formatSDT(details.SDT) || 'N/A'}</span></p>
                              <p className="text-blue-600"><span className="font-medium">MLT:</span> <span className="text-gray-900">{formatMLT(details.MLT2)}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Giá biểu:</span> <span className="text-gray-900">{details.GB}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Định mức:</span> <span className="text-gray-900">{details.DM}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Nhân viên đọc:</span> <span className="text-gray-900">{details.TenNhanVienDoc}</span></p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-blue-600"><span className="font-medium">Cỡ ĐH:</span> <span className="text-gray-900">{details.Co}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Hiệu:</span> <span className="text-gray-900">{details.Hieu}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Số thân:</span> <span className="text-gray-900">{details.SoThan}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Ngày gắn:</span> <span className="text-gray-900">{formatDate(details.NgayGan)}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Hộp:</span> <span className="text-gray-900">{details.HopBaoVe === 1 ? 'Có' : 'Không'}</span></p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-blue-600">
                                <span className="font-medium">Tình trạng:</span>{' '}
                                <span 
                                  style={
                                    (details.TinhTrang?.toLowerCase().includes('khóa') || 
                                     details.TinhTrang?.toLowerCase().includes('khoá'))
                                    ? { color: '#ff4d4d', fontWeight: 'bold' } 
                                    : (details.TinhTrang?.toLowerCase().includes('mở'))
                                    ? { color: '#22c55e', fontWeight: 'bold' }
                                    : { color: '#111827' }
                                  }
                                >
                                  {details.TinhTrang}
                                </span>
                              </p>
                              {(details.NgayKhoa && (details.TinhTrang?.toLowerCase().includes('khóa') || details.TinhTrang?.toLowerCase().includes('khoá'))) && <p className="text-blue-600"><span className="font-medium">Ngày khóa:</span> <span className="text-gray-900">{formatDate(details.NgayKhoa)}</span></p>}
                              {(details.NgayMo && details.TinhTrang?.toLowerCase().includes('mở')) && <p className="text-blue-600"><span className="font-medium">Ngày mở:</span> <span className="text-gray-900">{formatDate(details.NgayMo)}</span></p>}
                              <p className="text-blue-600"><span className="font-medium">Tổng cộng nợ:</span> <span className="text-gray-900">{formatCurrencyWithVND(details.TongCongNo)}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Số kỳ nợ:</span> <span className="text-gray-900">{details.SoKyNo}</span></p>
                              <p className="text-blue-600"><span className="font-medium">Các kỳ nợ:</span> <span className="text-gray-900">{details.KyNamNo}</span></p>
                            </div>
                          </div>

                          {history && history.length > 0 && (() => {
                            const currentPage = historyPages.get(danhBa) || 1
                            const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE)
                            const displayedHistory = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                            
                            return (
                            <div className="mt-8 border-t-2 border-dashed border-gray-200 pt-6">
                              <h4 className="font-bold text-gray-900 mb-4 text-xl flex items-center gap-2">
                                <span>📜</span> Lịch sử thanh toán <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border">({history.length} bản ghi)</span>
                              </h4>
                              <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-blue-600 text-white">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-bold text-white border-r border-blue-500">Kỳ</th>
                                      <th className="px-3 py-2 text-left font-bold text-white border-r border-blue-500">Năm</th>
                                      <th className="px-3 py-2 text-right font-bold text-white border-r border-blue-500">Tổng cộng</th>
                                      <th className="px-3 py-2 text-left font-bold text-white border-r border-blue-500">Ngày giải</th>
                                      <th className="px-3 py-2 text-left font-bold text-white border-r border-blue-500">NV giải</th>
                                      <th className="px-3 py-2 text-left font-bold text-white border-r border-blue-500">Ngày thu hộ</th>
                                      <th className="px-3 py-2 text-left font-bold text-white border-r border-blue-500">Ngân hàng thu hộ</th>
                                      <th className="px-3 py-2 text-left font-bold text-white border-r border-blue-500">Số hóa đơn</th>
                                      <th className="px-3 py-2 text-left font-bold text-white">Số biên lai</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {displayedHistory.map((h, idx) => (
                                      <tr key={idx} className="odd:bg-white even:bg-blue-50 hover:bg-blue-100 transition-colors">
                                        <td className="px-3 py-2 font-semibold text-gray-900">{h.Ky}</td>
                                        <td className="px-3 py-2 font-semibold text-gray-900">{h.Nam}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatNumber(h.TongCong)}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{h.NgayGiai ? new Date(h.NgayGiai).toLocaleDateString('vi-VN') : ''}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{h.NVGiai}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{formatDateTime(h.NgayThuHo)}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{h.NganHangThuHo || ''}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{h.SoHoaDon || ''}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{h.SoBienLai || ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 mt-6 pb-2">
                                  <button 
                                    onClick={() => setHistoryPages(prev => new Map(prev).set(danhBa, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                                  >
                                    Trước
                                  </button>
                                  <span className="text-gray-900 font-medium">Trang {currentPage} / {totalPages}</span>
                                  <button 
                                    onClick={() => setHistoryPages(prev => new Map(prev).set(danhBa, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                                  >
                                    Sau
                                  </button>
                                </div>
                              )}
                            </div>
                            )
                          })()}
                        </div>
                      ) : (
                        <p className="text-red-600 font-semibold">Lỗi khi tải chi tiết khách hàng</p>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
