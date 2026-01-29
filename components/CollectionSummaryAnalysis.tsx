'use client'

import { useState, useEffect } from 'react'
import { getCollectionSummary, getCollectionDetails, CollectionSummary, CollectionDetail } from '@/app/actions/collection-summary'

export default function CollectionSummaryAnalysis() {
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  
  const [summary, setSummary] = useState<CollectionSummary[]>([])
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [details, setDetails] = useState<CollectionDetail[]>([])
  
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: 'bank' | 'count' | 'total'; direction: 'asc' | 'desc' }>({ key: 'bank', direction: 'asc' })

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const result = await getCollectionSummary(startDate, endDate)
      setSummary(result)
      setSelectedBanks([])
      setDetails([])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedBanks.length > 0) {
      fetchDetails()
    } else {
      setDetails([])
    }
  }, [selectedBanks])

  const fetchDetails = async () => {
    setLoadingDetails(true)
    try {
      const result = await getCollectionDetails(startDate, endDate, selectedBanks)
      setDetails(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDetails(false)
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val)
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN')
    } catch {
      return dateStr
    }
  }

  const exportToExcel = () => {
    if (details.length === 0) return

    // Prepare data for export
    const exportData = details.map((row, idx) => ({
      'STT': idx + 1,
      'Số BK': row.soBK || '',
      'Danh bạ': row.danhBa,
      'Kỳ': row.ky,
      'Năm': row.nam,
      'Khách hàng': row.khachHang,
      'Số nhà': row.soNha,
      'Đường': row.duong,
      'Mã NH': row.maNH,
      'Số Hóa Đơn': row.soHoaDon,
      'Ngày Thanh Toán': new Date(row.ngayThanhToan).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      'Số Tiền': row.soTien
    }))

    // Convert to CSV
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(h => {
          const val = row[h as keyof typeof row]
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        }).join(',')
      )
    ].join('\n')

    // Download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const filename = selectedBanks.length === 1
      ? `ChiTietThuHo_${selectedBanks[0]}_${startDate}_${endDate}.csv`
      : `ChiTietThuHo_${selectedBanks.length}NH_${startDate}_${endDate}.csv`
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleBank = (bank: string) => {
    setSelectedBanks(prev =>
      prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]
    )
  }

  const selectAll = () => {
    setSelectedBanks(summary.map(s => s.bank))
  }

  const clearAll = () => {
    setSelectedBanks([])
  }

  // Group details by date
  const dailySummary = details.reduce((acc, d) => {
    const date = d.ngayThanhToan.split('T')[0]
    if (!acc[date]) acc[date] = { count: 0, total: 0 }
    acc[date].count += 1
    acc[date].total += d.soTien
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  const dailyRows = Object.entries(dailySummary).sort(([a], [b]) => a.localeCompare(b))



  const handleSort = (key: 'bank' | 'count' | 'total') => {
    let direction: 'asc' | 'desc' = 'desc'
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  // Render Sort Icon
  const SortIcon = ({ colKey }: { colKey: 'bank' | 'count' | 'total' }) => {
     if (sortConfig.key !== colKey) return <span className="text-blue-300 ml-1 opacity-50">↕</span>
     return <span className="text-white ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
  }

  // Calculate sorted data
  const sortedSummary = [...summary].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-center text-blue-600 mb-4">📊 Tổng Hợp Thu Hộ Theo Ngân Hàng</h2>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 font-bold shadow-[0_3px_0_rgb(29,78,216)] active:shadow-none active:translate-y-[3px] transition-all"
        >
          {loading ? 'Đang tải...' : 'Xem Báo Cáo'}
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left: Summary Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Bảng Tổng Hợp</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded shadow-[0_3px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[3px] transition-all"
              >
                Chọn tất cả
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded shadow-[0_3px_0_rgb(185,28,28)] active:shadow-none active:translate-y-[3px] transition-all"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Tổng: {summary.length} ngân hàng | Đã chọn: {selectedBanks.length}
          </p>

          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-blue-600 text-white select-none">
                <tr>
                   <th className="px-3 py-3 w-8 text-center font-bold border-r border-blue-500"></th>
                   <th className="px-3 py-3 w-12 text-center font-bold border-r border-blue-500">STT</th>
                   <th 
                        className="px-3 py-3 text-left font-bold border-r border-blue-500 cursor-pointer hover:bg-blue-700 transition"
                        onClick={() => handleSort('bank')}
                   >
                       Mã NH <SortIcon colKey="bank" />
                   </th>
                   <th 
                        className="px-3 py-3 text-right font-bold border-r border-blue-500 w-32 cursor-pointer hover:bg-blue-700 transition"
                        onClick={() => handleSort('count')}
                   >
                       Số HĐ <SortIcon colKey="count" />
                   </th>
                   <th 
                        className="px-3 py-3 text-right font-bold border-r border-blue-500 cursor-pointer hover:bg-blue-700 transition"
                        onClick={() => handleSort('total')}
                   >
                       Tổng thu <SortIcon colKey="total" />
                   </th>
                   <th className="px-3 py-3 text-right font-bold w-24">%</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">Chưa có dữ liệu</td></tr>
                ) : (
                  (() => {
                    const grandTotal = summary.reduce((s, r) => s + r.total, 0) || 1
                    
                    return sortedSummary
                        .map((row, idx) => {
                            const percent = (row.total / grandTotal) * 100
                            return (
                                <tr key={row.bank} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2 text-center border-r border-gray-100">
                                    <input
                                      type="checkbox"
                                      checked={selectedBanks.includes(row.bank)}
                                      onChange={() => toggleBank(row.bank)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center border-r border-gray-100 font-medium text-gray-500">{idx + 1}</td>
                                  <td className="px-3 py-2 border-r border-gray-100 font-medium text-gray-900">{row.bank}</td>
                                  
                                  {/* Count Column - Orange Tint */}
                                  <td className="px-3 py-2 text-right border-r border-gray-100 font-medium text-gray-900 bg-orange-50">
                                      {row.count.toLocaleString()}
                                  </td>
                                  
                                  {/* Total Column - Green Tint */}
                                  <td className="px-3 py-2 text-right border-r border-gray-100 font-bold text-gray-900 bg-green-50">
                                      {formatCurrency(row.total)}
                                  </td>

                                  {/* Percent Column - Amber Tint */}
                                  <td className="px-3 py-2 text-right font-medium text-gray-900 bg-amber-50">
                                      {percent.toFixed(2)}%
                                  </td>
                                </tr>
                            )
                        })
                  })()
                )}
              </tbody>
              {summary.length > 0 && (
                <tfoot className="bg-orange-400 text-white font-bold">
                  <tr>
                    <td className="px-3 py-2 border-r border-orange-300"></td>
                    <td className="px-3 py-2 border-r border-orange-300"></td>
                    <td className="px-3 py-2 text-center border-r border-orange-300">TỔNG CỘNG</td>
                    <td className="px-3 py-2 text-right border-r border-orange-300">{summary.reduce((s, r) => s + r.count, 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right border-r border-orange-300">{formatCurrency(summary.reduce((s, r) => s + r.total, 0))}</td>
                    <td className="px-3 py-2 text-right">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-3 space-y-4">
          {selectedBanks.length === 0 ? (
            <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
              <p>Chọn ngân hàng bên trái để xem chi tiết</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Chi tiết theo ngày</h3>
                  <p className="text-sm text-gray-600">
                    {selectedBanks.length === 1 ? `Ngân hàng: ${selectedBanks[0]}` : `${selectedBanks.length} ngân hàng`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {loadingDetails && <span className="text-sm text-blue-600">Đang tải...</span>}
                  {details.length > 0 && (
                    <button
                      onClick={exportToExcel}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-400 font-bold flex items-center gap-1 shadow-[0_3px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[3px] transition-all"
                    >
                      📥 Tải Excel ({details.length} giao dịch)
                    </button>
                  )}
                </div>
              </div>

              {details.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-900">Ngày</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-900">Số HĐ</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-900">Tổng cộng</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dailyRows.map(([date, stats]) => (
                        <tr key={date} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{formatDate(date)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{stats.count.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{formatCurrency(stats.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-orange-400 text-white font-bold">
                      <tr>
                        <td className="px-3 py-2">TỔNG CỘNG</td>
                        <td className="px-3 py-2 text-right">{details.length.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(details.reduce((s, d) => s + d.soTien, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
