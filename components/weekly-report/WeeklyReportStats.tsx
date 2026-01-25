'use client'

interface WeeklyReportStatsProps {
    stats: any[]
}

export default function WeeklyReportStats({ stats }: WeeklyReportStatsProps) {
    if (!stats || stats.length === 0) {
        return null
    }

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden">
            <div className="p-4 bg-slate-100 border-b border-slate-300">
                <h3 className="font-bold text-slate-900 text-base">📊 Thống kê Đóng/Mở nước</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-200 text-slate-900 font-bold uppercase text-xs border-b border-slate-300">
                        <tr>
                            <th className="px-4 py-3 border-r border-slate-200">Ngày</th>
                            <th className="px-4 py-3 border-r border-slate-200">Nhóm</th>
                            <th className="px-4 py-3 text-right border-r border-slate-200">Khoá từ</th>
                            <th className="px-4 py-3 text-right border-r border-slate-200">Khóa van</th>
                            <th className="px-4 py-3 text-right border-r border-slate-200">Khóa NB</th>
                            <th className="px-4 py-3 text-right border-r border-slate-200 text-purple-700">Số Lượng Mở</th>
                            <th className="px-4 py-3 text-right text-green-700">Thanh toán ngày</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {stats.map((row, idx) => {
                            const isTotal = row.Ngay === 'Tổng cộng'
                            const rowClass = isTotal
                                ? 'bg-blue-50 font-bold text-slate-900'
                                : 'hover:bg-blue-50 transition-colors'

                            return (
                                <tr key={idx} className={rowClass}>
                                    <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                                        {row.Ngay}
                                    </td>
                                    <td className="px-4 py-3 text-slate-800 font-medium border-r border-slate-100">
                                        {row.Nhom}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 border-r border-slate-100">
                                        {row.KhoaTu || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 border-r border-slate-100">
                                        {row.KhoaVan || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 border-r border-slate-100">
                                        {row.KhoaNB || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right text-purple-700 font-bold border-r border-slate-100">
                                        {row.SoLuongMo || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right text-green-700 font-bold">
                                        {row.ThanhToanNgay || 0}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
