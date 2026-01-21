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

  const toggleCustomer = async (danhBa: string | number) => {
    const danhBaStr = String(danhBa)
    const newSelected = new Set(selectedCustomers)
    
    if (newSelected.has(danhBaStr)) {
      newSelected.delete(danhBaStr)
    } else {
      newSelected.add(danhBaStr)
      
      // Load details if not already loaded
      if (!customerDetails.has(danhBaStr)) {
        setLoadingDetails(prev => new Set(prev).add(danhBaStr))
        try {
          console.log('[toggleCustomer] Loading details for:', danhBaStr)
          const details = await getCustomerDetails(danhBaStr)
          console.log('[toggleCustomer] Details loaded:', details)
          
          if (details) {
            setCustomerDetails(prev => new Map(prev).set(danhBaStr, details))
          } else {
            console.error('[toggleCustomer] No details returned')
            alert(`Không thể tải thông tin chi tiết cho danh bạ ${danhBaStr}`)
          }
        } catch (error) {
          console.error('[toggleCustomer] Error loading details:', error)
          alert(`Lỗi khi tải chi tiết: ${error}`)
        } finally {
          setLoadingDetails(prev => {
            const newSet = new Set(prev)
            newSet.delete(danhBaStr)
            return newSet
          })
        }
      }
    }
    
    setSelectedCustomers(newSelected)
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
          <h1 className="text-3xl font-bold text-gray-900">🔎 Tra cứu Thông tin Khách hàng</h1>
          <p className="text-gray-500 mt-1">Nhập thông tin bên dưới rồi nhấn 'Tìm kiếm'. Sau đó, tích vào ô 'Xem' để xem chi tiết.</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Danh bạ</label>
              <input
                type="text"
                value={danhba}
                onChange={(e) => setDanhba(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tên Khách hàng</label>
              <input
                type="text"
                value={tenkh}
                onChange={(e) => setTenkh(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Địa chỉ (VD: 285 Võ Văn Tần)</label>
              <input
                type="text"
                value={diaChi}
                onChange={(e) => setDiaChi(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="285 Võ Văn Tần"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Mã lộ trình (MLT2)</label>
              <input
                type="text"
                value={mlt2}
                onChange={(e) => setMlt2(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={sdt}
                onChange={(e) => setSdt(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Số thân đồng hồ</label>
              <input
                type="text"
                value={sothan}
                onChange={(e) => setSothan(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Giá biểu (GB)</label>
              <select
                value={gb}
                onChange={(e) => setGb(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {gbOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Cỡ ĐH</label>
              <select
                value={co}
                onChange={(e) => setCo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {coOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tổng nợ (VNĐ)</label>
              <input
                type="text"
                value={tongNo}
                onChange={(e) => setTongNo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập số tiền nợ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tiền hóa đơn (VNĐ)</label>
              <input
                type="text"
                value={tienHd}
                onChange={(e) => setTienHd(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập số tiền hóa đơn..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Số biên lai</label>
              <input
                type="text"
                value={soBienLai}
                onChange={(e) => setSoBienLai(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="VD: 339/5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm'}
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
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Kết quả tìm kiếm
                {customers.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({customers.length} khách hàng)
                  </span>
                )}
              </h2>
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
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Xem</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Danh bạ</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">MLT2</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Tên KH</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Số nhà</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Đường</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">SDT</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Số thân</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Hiệu ĐH</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Cỡ ĐH</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">GB</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customers.map((customer) => (
                        <tr key={customer.DanhBa} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedCustomers.has(String(customer.DanhBa))}
                              onChange={() => toggleCustomer(customer.DanhBa)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-sm text-gray-900">{formatDanhBa(customer.DanhBa)}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.MLT2}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{customer.TenKH}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.So}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.Duong}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.SDT || ''}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.SoThan || ''}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.Hieu || ''}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.Co || ''}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.GB}</td>
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
                    <div key={danhBa} className="border-t border-gray-200 p-6">
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="mt-2 text-gray-500">Đang tải chi tiết...</p>
                        </div>
                      ) : details ? (
                        <div>
                          <div className="flex justify-between items-start mb-4 bg-gray-900 p-4 rounded-lg">
                            <div>
                              <h3 className="text-2xl font-bold text-yellow-600">
                                {formatDanhBa(details.DanhBa)} <span className="text-white font-normal">- {details.So} {details.Duong}</span>
                              </h3>
                              <p className="font-semibold text-white text-lg">{details.TenKH}</p>
                            </div>
                            <button
                              onClick={() => loadPaymentHistory(danhBa)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                            >
                              Kiểm tra thanh toán
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-6 mb-4">
                            <div className="space-y-2">
                              <p className="text-blue-600"><span className="font-medium">Số điện thoại:</span> <span className="text-gray-900">{details.SDT || 'N/A'}</span></p>
                              <p className="text-blue-600"><span className="font-medium">MLT:</span> <span className="text-gray-900">{details.MLT2}</span></p>
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

                          {history && history.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                              <h4 className="font-bold text-gray-900 mb-3 text-lg">Lịch sử thanh toán</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">Kỳ</th>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">Năm</th>
                                      <th className="px-3 py-2 text-right font-bold text-gray-900">Tổng cộng</th>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">Ngày giải</th>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">NV giải</th>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">Ngày thu hộ</th>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">Ngân hàng thu hộ</th>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">Số hóa đơn</th>
                                      <th className="px-3 py-2 text-left font-bold text-gray-900">Số biên lai</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {history.map((h, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
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
                            </div>
                          )}
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
