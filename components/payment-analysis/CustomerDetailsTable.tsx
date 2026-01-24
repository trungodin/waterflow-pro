'use client'

import { useState, useMemo } from 'react'
import type { CustomerPaymentStatus } from '@/lib/analysis/payment-report'

interface CustomerDetailsTableProps {
    data: CustomerPaymentStatus[] | undefined
}

export default function CustomerDetailsTable({ data }: CustomerDetailsTableProps) {
    const [filter, setFilter] = useState('')

    const filteredData = useMemo(() => {
        if (!data) return []
        if (!filter) return data

        const lower = filter.toLowerCase()
        return data.filter(c =>
            c.DANH_BO.includes(lower) ||
            c.TEN_KH.toLowerCase().includes(lower) ||
            c.DIA_CHI.toLowerCase().includes(lower)
        )
    }, [data, filter])

    if (!data || data.length === 0) return null

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center gap-4 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-800">📋 Chi Tiết Khách Hàng ({filteredData.length})</h3>
                <input
                    type="text"
                    placeholder="Tìm danh bộ, tên, địa chỉ..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 min-w-[250px]"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh Bộ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách Hàng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Giao</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ Nợ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredData.slice(0, 500).map((customer) => (
                            <tr key={customer.ID} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                                    {customer.DANH_BO}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <div className="font-medium text-gray-900">{customer.TEN_KH}</div>
                                    <div className="text-xs">{customer.DIA_CHI}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {customer.NGAY_GIAO}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.STATUS === 'Đã Thanh Toán'
                                            ? 'bg-green-100 text-green-800'
                                            : customer.STATUS === 'Khóa Nước'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {customer.STATUS}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
                                    {customer.DETAILS_UNPAID || '-'}
                                </td>
                            </tr>
                        ))}

                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Không tìm thấy khách hàng nào.
                                </td>
                            </tr>
                        )}
                        {filteredData.length > 500 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 bg-gray-50">
                                    Hiển thị 500/{filteredData.length} kết quả. Hãy tìm kiếm để lọc thêm.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
