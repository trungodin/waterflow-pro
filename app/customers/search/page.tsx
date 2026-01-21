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
    setLoading(true)
    setSearched(true)
    setSelectedCustomers(new Set())
    setCustomerDetails(new Map())
    setPaymentHistories(new Map())
    
    try {
      const params: CustomerSearchParams = {
        danhba,
        tenkh,
        dia_chi: diaChi,
        mlt2,
        sdt,
        sothan,
        gb: gb !== 'Tất cả' ? gb : undefined,
        tong_no: tongNo,
        tien_hd: tienHd,
        co: co !== 'Tất cả' ? co : undefined,
        so_bien_lai: soBienLai
      }
      
      const results = await searchCustomers(params)
      setCustomers(results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCustomer = async (danhBa: string) => {
    const newSelected = new Set(selectedCustomers)
    
    if (newSelected.has(danhBa)) {
      newSelected.delete(danhBa)
    } else {
      newSelected.add(danhBa)
      
      // Load details if not already loaded
      if (!customerDetails.has(danhBa)) {
        setLoadingDetails(prev => new Set(prev).add(danhBa))
        try {
          const details = await getCustomerDetails(danhBa)
          if (details) {
            setCustomerDetails(prev => new Map(prev).set(danhBa, details))
          }
        } catch (error) {
          console.error('Error loading details:', error)
        } finally {
          setLoadingDetails(prev => {
            const newSet = new Set(prev)
            newSet.delete(danhBa)
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ'
  }

  const formatDanhBa = (danhBa: string) => {
    return danhBa.padStart(11, '0')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🔎 Tra cứu Thông tin Khách hàng</h1>
          <p className="text-gray-500 mt-1">Nhập thông tin bên dưới rồi nhấn 'Tìm kiếm'. Sau đó, tích vào ô 'Xem' để xem chi tiết.</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh bạ</label>
              <input
                type="text"
                value={danhba}
                onChange={(e) => setDanhba(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên Khách hàng</label>
              <input
                type="text"
                value={tenkh}
                onChange={(e) => setTenkh(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ (VD: 285 Võ Văn Tần)</label>
              <input
                type="text"
                value={diaChi}
                onChange={(e) => setDiaChi(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã lộ trình (MLT2)</label>
              <input
                type="text"
                value={mlt2}
                onChange={(e) => setMlt2(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={sdt}
                onChange={(e) => setSdt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số thân đồng hồ</label>
              <input
                type="text"
                value={sothan}
                onChange={(e) => setSothan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá biểu (GB)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tổng nợ (VNĐ)</label>
              <input
                type="text"
                value={tongNo}
                onChange={(e) => setTongNo(e.target.value)}
                placeholder="Nhập số tiền nợ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiền hóa đơn (VNĐ)</label>
              <input
                type="text"
                value={tienHd}
                onChange={(e) => setTienHd(e.target.value)}
                placeholder="Nhập số tiền hóa đơn..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Row 4 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cỡ ĐH</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số biên lai</label>
              <input
                type="text"
                value={soBienLai}
                onChange={(e) => setSoBienLai(e.target.value)}
                placeholder="VD: 339/5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm'}
            </button>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Xem</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh bạ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên KH</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số nhà</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đường</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GB</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customers.map((customer) => (
                        <tr key={customer.DanhBa} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedCustomers.has(customer.DanhBa)}
                              onChange={() => toggleCustomer(customer.DanhBa)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-sm">{formatDanhBa(customer.DanhBa)}</td>
                          <td className="px-6 py-4 text-sm">{customer.TenKH}</td>
                          <td className="px-6 py-4 text-sm">{customer.So}</td>
                          <td className="px-6 py-4 text-sm">{customer.Duong}</td>
                          <td className="px-6 py-4 text-sm">{customer.GB}</td>
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
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-2xl font-bold text-yellow-600">{formatDanhBa(details.DanhBa)}</h3>
                              <p className="text-gray-600">{details.So} {details.Duong}</p>
                              <p className="font-semibold">{details.TenKH}</p>
                            </div>
                            <button
                              onClick={() => loadPaymentHistory(danhBa)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Kiểm tra thanh toán
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-6 mb-4">
                            <div>
                              <p className="text-blue-600">Số điện thoại: <span className="font-bold text-gray-900">{details.SDT || 'N/A'}</span></p>
                              <p className="text-blue-600">MLT: <span className="font-bold text-gray-900">{details.MLT2}</span></p>
                              <p className="text-blue-600">Giá biểu: <span className="font-bold text-gray-900">{details.GB}</span></p>
                              <p className="text-blue-600">Định mức: <span className="font-bold text-gray-900">{details.DM}</span></p>
                              <p className="text-blue-600">Nhân viên đọc: <span className="font-bold text-gray-900">{details.TenNhanVienDoc}</span></p>
                            </div>
                            <div>
                              <p className="text-blue-600">Cỡ ĐH: <span className="font-bold text-gray-900">{details.Co}</span></p>
                              <p className="text-blue-600">Hiệu: <span className="font-bold text-gray-900">{details.Hieu}</span></p>
                              <p className="text-blue-600">Số thân: <span className="font-bold text-gray-900">{details.SoThan}</span></p>
                              <p className="text-blue-600">Ngày gắn: <span className="font-bold text-gray-900">{details.NgayGan || 'N/A'}</span></p>
                              <p className="text-blue-600">Hộp: <span className="font-bold text-gray-900">{details.HopBaoVe === 1 ? 'Có' : 'Không'}</span></p>
                            </div>
                            <div>
                              <p className="text-blue-600">Tình trạng: <span className={`font-bold ${details.TinhTrang?.toLowerCase().includes('khóa') ? 'text-red-600' : 'text-gray-900'}`}>{details.TinhTrang}</span></p>
                              {details.NgayKhoa && <p className="text-blue-600">Ngày khóa: <span className="font-bold text-gray-900">{details.NgayKhoa}</span></p>}
                              <p className="text-blue-600">Tổng cộng nợ: <span className="font-bold text-gray-900">{formatCurrency(details.TongCongNo)}</span></p>
                              <p className="text-blue-600">Số kỳ nợ: <span className="font-bold text-gray-900">{details.SoKyNo}</span></p>
                              <p className="text-blue-600">Các kỳ nợ: <span className="font-bold text-gray-900">{details.KyNamNo}</span></p>
                            </div>
                          </div>

                          {history && history.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                              <h4 className="font-semibold mb-3">Lịch sử thanh toán</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Kỳ</th>
                                      <th className="px-3 py-2 text-left">Năm</th>
                                      <th className="px-3 py-2 text-right">Tổng cộng</th>
                                      <th className="px-3 py-2 text-left">Ngày giải</th>
                                      <th className="px-3 py-2 text-left">NV giải</th>
                                      <th className="px-3 py-2 text-left">Số biên lai</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {history.map((h, idx) => (
                                      <tr key={idx}>
                                        <td className="px-3 py-2">{h.Ky}</td>
                                        <td className="px-3 py-2">{h.Nam}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(h.TongCong)}</td>
                                        <td className="px-3 py-2">{h.NgayGiai ? new Date(h.NgayGiai).toLocaleDateString('vi-VN') : ''}</td>
                                        <td className="px-3 py-2">{h.NVGiai}</td>
                                        <td className="px-3 py-2">{h.SoBienLai}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-red-500">Lỗi khi tải chi tiết khách hàng</p>
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
