'use client'

import { useState, useEffect } from 'react'
import { getBankSummary } from '@/app/actions/bank-summary'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BankSummaryRow {
  bank: string
  total: number
  count: number
  percent: number
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28EFF', '#FF66B2', '#66FF66', '#FF6666', '#66B2FF', '#FFB266',
]

export default function BankSummaryAnalysis() {
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [data, setData] = useState<BankSummaryRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await getBankSummary(startDate, endDate)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  // Transform data for Recharts Pie chart
  const chartData = data.map(row => ({ name: row.bank, value: row.total }))

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-center text-blue-600 mb-4">📊 Tổng hợp Ngân hàng Thu hộ</h2>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Đang tải...' : 'Xem dữ liệu'}
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-900">Ngân hàng</th>
              <th className="px-4 py-3 text-right font-medium text-gray-900">Tổng cộng</th>
              <th className="px-4 py-3 text-right font-medium text-gray-900">Số hoá đơn</th>
              <th className="px-4 py-3 text-right font-medium text-gray-900">% Tổng</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-gray-500">Không có dữ liệu</td>
              </tr>
            ) : (
              data.map(row => (
                <tr key={row.bank} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.bank}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(row.total)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{row.count}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{(row.percent ?? 0).toFixed(2)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
