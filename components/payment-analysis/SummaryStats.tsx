'use client'

import type { PaymentReportSummary } from '@/lib/analysis/payment-report'

interface SummaryStatsProps {
    data: PaymentReportSummary | undefined
}

export default function SummaryStats({ data }: SummaryStatsProps) {
    if (!data) return null

    const stats = [
        {
            label: 'Tổng Số Lượng',
            value: data.total,
            color: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: '🆔'
        },
        {
            label: 'Đã Thanh Toán',
            value: data.paid,
            color: 'bg-green-50 text-green-700 border-green-200',
            icon: '✅'
        },
        {
            label: 'Khóa Nước',
            value: data.locked,
            color: 'bg-red-50 text-red-700 border-red-200',
            icon: '🔒'
        },
        {
            label: 'Tỷ Lệ Hoàn Thành',
            value: `${data.completionRate.toFixed(2)}%`,
            color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            icon: '📈'
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className={`p-4 rounded-xl border shadow-sm ${stat.color} flex items-center justify-between`}
                >
                    <div>
                        <p className="text-sm font-medium opacity-80 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="text-3xl opacity-50">{stat.icon}</div>
                </div>
            ))}
        </div>
    )
}
