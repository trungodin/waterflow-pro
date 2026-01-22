'use client'

import { useState, useMemo } from 'react'
import VirtualDMNTable from './VirtualDMNTable'

interface LocDuLieuTonProps {
  data: any[]
  formatCurrency: (val: string | number) => string | number
}

export default function LocDuLieuTon({ data, formatCurrency }: LocDuLieuTonProps) {
  const [minKy, setMinKy] = useState<string>('')
  const [minNo, setMinNo] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'binh_thuong', label: 'Bình thường (Chưa khóa)' },
    { value: 'da_khoa', label: 'Đã khóa / Đóng nước' },
    { value: 'huy', label: 'Hủy / Tháo gỡ' }
  ]

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Filter by Status
      const status = (item.TinhTrang || '').toLowerCase()
      if (selectedStatus === 'binh_thuong') {
        if (status.includes('khóa') || status.includes('đóng') || status.includes('hủy') || status.includes('cat') || status.includes('cắt')) return false
      } else if (selectedStatus === 'da_khoa') {
        if (!status.includes('khóa') && !status.includes('đóng') && !status.includes('cat') && !status.includes('cắt')) return false
      } else if (selectedStatus === 'huy') {
        if (!status.includes('hủy') && !status.includes('tháo')) return false
      }

      // 2. Filter by Debt Amount
      if (minNo) {
        const debtVal = parseFloat(String(item.TongNo).replace(/[.,]/g, ''))
        const minVal = parseFloat(minNo.replace(/[.,]/g, ''))
        if (isNaN(debtVal) || debtVal < minVal) return false
      }

      // 3. Filter by Periods (Ky)
      if (minKy) {
        const periods = parseInt(item.TongKy)
        const minP = parseInt(minKy)
        if (isNaN(periods) || periods < minP) return false
      }

      return true
    })
  }, [data, selectedStatus, minNo, minKy])

  // Calculate summary stats
  const totalDebt = useMemo(() => {
    return filteredData.reduce((sum, item) => {
      const val = parseFloat(String(item.TongNo).replace(/[.,]/g, ''))
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
  }, [filteredData])

  return (
    <div className='flex flex-col h-full gap-4 animate-in fade-in duration-500'>
      {/* Filters Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
        <h3 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center gap-2">
            <span className="text-blue-500">⚙️</span> Bộ Lọc Dữ Liệu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái KH</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-white"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Min Debt Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng nợ tối thiểu</label>
             <div className="relative group">
                <input
                  type="number"
                  placeholder="0"
                  value={minNo}
                  onChange={(e) => setMinNo(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:bg-white"
                />
                <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-bold pointer-events-none group-focus-within:text-blue-500">VNĐ</span>
             </div>
          </div>

          {/* Min Periods Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Số kỳ nợ tối thiểu</label>
            <div className="relative group">
                <input
                  type="number"
                  placeholder="0"
                  value={minKy}
                  onChange={(e) => setMinKy(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:bg-white"
                />
                <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-bold pointer-events-none group-focus-within:text-blue-500">Kỳ</span>
            </div>
          </div>
          
           {/* Text Search */}
           <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tìm kiếm (Tên/DB/Địa chỉ)</label>
            <div className="relative group">
                <span className="absolute left-3 top-2.5 text-gray-400 pointer-events-none group-focus-within:text-blue-500">🔍</span>
                <input
                    type="text"
                    placeholder="Nhập từ khóa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all focus:bg-white"
                />
            </div>
          </div>

        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex flex-wrap gap-6 text-sm items-center">
             <div className="text-gray-700 flex items-center gap-2">
                <span className="bg-white p-1.5 rounded-md shadow-sm text-blue-600">👥</span>
                Kết quả lọc: <span className="font-bold text-gray-900 text-lg">{filteredData.length}</span> <span className="text-xs text-gray-500 font-medium">KHÁCH HÀNG</span>
             </div>
             <div className="h-8 w-px bg-blue-200 hidden md:block"></div>
             <div className="text-gray-700 flex items-center gap-2">
                <span className="bg-white p-1.5 rounded-md shadow-sm text-red-600">💰</span>
                Tổng dư nợ: <span className="font-bold text-red-600 text-lg">{formatCurrency(totalDebt)}</span> <span className="text-xs text-gray-500 font-medium">VNĐ</span>
             </div>
          </div>
          
          <div>
            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center gap-2">
                <span>📥</span> Xuất Excel
            </button>
          </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 min-h-[500px] border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg shadow-gray-100/50">
         <VirtualDMNTable 
            data={filteredData} 
            searchTerm={searchTerm} 
            formatCurrency={formatCurrency} 
         />
      </div>
    </div>
  )
}
