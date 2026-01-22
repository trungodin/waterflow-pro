'use client'

import { useState, useEffect } from 'react'
import { getGroupStatistics, getAvailableYears, getGroupDetails, GroupStatistics, GroupDetail } from '@/app/actions/group-statistics'

export default function GroupStatisticsAnalysis() {
  const [years, setYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [kyOperator, setKyOperator] = useState<string>('all')
  const [kyValue, setKyValue] = useState<number>(1)
  const [groupBy, setGroupBy] = useState<'DOT' | 'GB' | 'CUSTOMER_GROUP'>('DOT')
  
  const [data, setData] = useState<GroupStatistics[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  useEffect(() => {
    loadYears()
  }, [])

  const loadYears = async () => {
    const availableYears = await getAvailableYears()
    setYears(availableYears)
    if (availableYears.length > 0) {
      setSelectedYear(String(availableYears[0]))
    }
  }

  const handleRunAnalysis = async () => {
    setLoading(true)
    try {
      const year = selectedYear === 'all' ? null : parseInt(selectedYear)
      const ky = kyOperator === 'all' ? null : kyValue
      const operator = kyOperator === 'all' ? null : kyOperator
      
      const result = await getGroupStatistics(year, ky, operator, groupBy)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val)
  
  const totalDB = data.reduce((s, r) => s + r.countDB, 0)
  const totalPeriods = data.reduce((s, r) => s + r.totalPeriods, 0)
  const totalDebt = data.reduce((s, r) => s + r.totalDebt, 0)

  const getGroupLabel = () => {
    if (groupBy === 'DOT') return 'Đợt'
    if (groupBy === 'GB') return 'GB'
    return 'Nhóm KH'
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-center text-blue-600 mb-4">📊 Thống kê theo Nhóm</h2>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left: Year & Period */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Năm</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📆 Kỳ</label>
              <select
                value={kyOperator}
                onChange={e => setKyOperator(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="=">=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
              </select>
            </div>

            {kyOperator !== 'all' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị kỳ</label>
                <select
                  value={kyValue}
                  onChange={e => setKyValue(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right: Group By */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Nhóm theo</label>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as 'DOT' | 'GB' | 'CUSTOMER_GROUP')}
                className="w-full px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="DOT">Đợt (DOT)</option>
                <option value="GB">Giá Biểu (GB)</option>
                <option value="CUSTOMER_GROUP">Nhóm Khách hàng</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={loading}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Đang tải...' : '📊 Thực hiện Thống kê'}
        </button>
      </div>

      {/* Results */}
      {data.length > 0 && (
        <>
          <hr className="border-gray-200" />
          
          {/* Summary metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">Tổng Số Danh Bạ</div>
              <div className="text-2xl font-bold text-blue-700">{totalDB.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Tổng Số Kỳ Nợ</div>
              <div className="text-2xl font-bold text-green-700">{totalPeriods.toLocaleString()}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-sm text-gray-600 mb-1">Tổng Nợ</div>
              <div className="text-2xl font-bold text-red-700">{formatCurrency(totalDebt)}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">Kỳ TB/Danh Bạ</div>
              <div className="text-2xl font-bold text-purple-700">{(totalPeriods / totalDB || 0).toFixed(1)}</div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">{getGroupLabel()}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Số Lượng DB</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Tổng Số Kỳ Nợ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Tổng Nợ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Tỷ Lệ %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map(row => (
                  <tr 
                    key={row.group} 
                    className="hover:bg-blue-50 cursor-pointer"
                    onClick={() => setSelectedGroup(row.group)}
                  >
                    <td className="px-4 py-3 text-center font-medium text-blue-600 underline">{row.group}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{row.countDB.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{row.totalPeriods.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(row.totalDebt)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{row.percentage.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-orange-400 text-white font-bold">
                <tr>
                  <td className="px-4 py-3 text-center">TỔNG CỘNG</td>
                  <td className="px-4 py-3 text-right">{totalDB.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{totalPeriods.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalDebt)}</td>
                  <td className="px-4 py-3 text-right">100.00%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <hr className="border-gray-200" />

          {/* Top 5 Analysis */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">📊 Top 5 {getGroupLabel()} có số lượng DB nhiều nhất</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">{groupBy === 'DOT' ? 'Đợt' : 'GB'}</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-900">Số DB</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-900">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.slice(0, 5).map(row => (
                      <tr key={row.group} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{row.group}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{row.countDB.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{row.percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">💰 Top 5 {getGroupLabel()} có tổng nợ cao nhất</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">{groupBy === 'DOT' ? 'Đợt' : 'GB'}</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-900">Tổng Nợ</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-900">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...data].sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5).map(row => (
                      <tr key={row.group} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{row.group}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">{formatCurrency(row.totalDebt)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{row.percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          {selectedGroup && (
            <>
              <hr className="border-gray-200" />
              <InvoiceDetails
                groupValue={selectedGroup}
                groupBy={groupBy}
                year={selectedYear === 'all' ? null : parseInt(selectedYear)}
                kyFilter={kyOperator === 'all' ? null : kyValue}
                kyOperator={kyOperator === 'all' ? null : kyOperator}
                onClose={() => setSelectedGroup(null)}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

// Sub-component for invoice details
function InvoiceDetails({
  groupValue,
  groupBy,
  year,
  kyFilter,
  kyOperator,
  onClose
}: {
  groupValue: string
  groupBy: 'DOT' | 'GB' | 'CUSTOMER_GROUP'
  year: number | null
  kyFilter: number | null
  kyOperator: string | null
  onClose: () => void
}) {
  const [details, setDetails] = useState<GroupDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDetails()
  }, [groupValue])

  const loadDetails = async () => {
    setLoading(true)
    try {
      const result = await getGroupDetails(groupValue, groupBy, year, kyFilter, kyOperator)
      setDetails(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  // Group by danhBa
  const grouped = details.reduce((acc, d) => {
    if (!acc[d.danhBa]) {
      acc[d.danhBa] = {
        danhBa: d.danhBa,
        tenKH: d.tenKH,
        so: d.so,
        duong: d.duong,
        gb: d.gb,
        dot: d.dot,
        totalKy: 0,
        totalDebt: 0,
        periods: [] as string[]
      }
    }
    acc[d.danhBa].totalKy += 1
    acc[d.danhBa].totalDebt += d.soTien
    acc[d.danhBa].periods.push(`${d.ky}/${d.nam}`)
    return acc
  }, {} as Record<string, any>)

  const groupedData = Object.values(grouped).sort((a: any, b: any) => a.dot - b.dot)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          🔍 Chi tiết hóa đơn - {groupBy === 'DOT' ? 'Đợt' : 'GB'} {groupValue}
        </h3>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
        >
          ✕ Đóng
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Đang tải...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xs text-gray-600">Số hóa đơn</div>
              <div className="text-xl font-bold text-blue-700">{details.length.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-xs text-gray-600">Số danh bạ</div>
              <div className="text-xl font-bold text-green-700">{groupedData.length.toLocaleString()}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-xs text-gray-600">Tổng nợ</div>
              <div className="text-xl font-bold text-red-700">{formatCurrency(details.reduce((s, d) => s + d.soTien, 0))}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="text-xs text-gray-600">Kỳ nợ TB</div>
              <div className="text-xl font-bold text-purple-700">{(details.length / groupedData.length || 0).toFixed(1)}</div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">Danh Bạ</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">Số</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">Đường</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">Tên KH</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-900">Đợt</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-900">Tổng Kỳ</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-900">Tổng Cộng</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900">Kỳ/Năm</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedData.map((row: any) => (
                  <tr key={row.danhBa} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.danhBa}</td>
                    <td className="px-3 py-2 text-gray-900">{row.so}</td>
                    <td className="px-3 py-2 text-gray-900">{row.duong}</td>
                    <td className="px-3 py-2 text-gray-900">{row.tenKH}</td>
                    <td className="px-3 py-2 text-center text-gray-900">{row.dot}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{row.totalKy}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatCurrency(row.totalDebt)}</td>
                    <td className="px-3 py-2 text-gray-900 text-xs">{row.periods.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
