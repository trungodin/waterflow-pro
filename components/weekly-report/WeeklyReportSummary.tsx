'use client'

import React from 'react'

interface SummaryProps {
    summary: any[]
    pieData: any
}

export default function WeeklyReportSummary({ summary, pieData }: SummaryProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden">
                <div className="p-4 bg-slate-100 border-b border-slate-300">
                    <h3 className="font-bold text-slate-900 text-base">📊 Bảng tổng hợp tuần</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-200 text-slate-900 font-bold uppercase text-xs border-b border-slate-300">
                            <tr>
                                <th className="px-4 py-3">Nhóm</th>
                                <th className="px-4 py-3">Ngày Giao</th>
                                <th className="px-4 py-3 text-right">Số Lượng</th>
                                <th className="px-4 py-3 text-right">Đã Thanh Toán</th>
                                <th className="px-4 py-3 text-right">Khóa Nước</th>
                                <th className="px-4 py-3 text-right text-purple-700">Đã Mở</th>
                                <th className="px-4 py-3 text-right">% Hoàn Thành</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {summary.map((row, idx) => (
                                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-900">{row.Nhom}</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{row.NgayGiao}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900">{row.SoLuong}</td>
                                    <td className="px-4 py-3 text-right text-green-700 font-bold">{row.DaThanhToan}</td>
                                    <td className="px-4 py-3 text-right text-red-700 font-bold">{row.KhoaNuoc}</td>
                                    <td className="px-4 py-3 text-right text-purple-700 font-bold">{row.MoNuoc}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${parseFloat(row.PhanTram) >= 100 ? 'bg-green-100 text-green-800 border-green-200' :
                                            parseFloat(row.PhanTram) >= 50 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200'
                                            }`}>
                                            {row.PhanTram}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Visual Charts could be added here later */}
        </div>
    )
}
