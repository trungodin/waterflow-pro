
import React from 'react';
import { DotAnalysisData } from '@/app/readings/analysis-actions';
import { 
    Users, 
    Droplet, 
    Banknote, 
    TrendingUp 
} from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';

interface DotStatsProps {
    data: DotAnalysisData[];
    ky: number;
    nam: number;
}

export default function DotStats({ data, ky, nam }: DotStatsProps) {
    if (!data || data.length === 0) return null;

    // Calculate totals
    const totalSoLuong = data.reduce((sum, item) => sum + Number(item.SoLuong || 0), 0);
    const totalSanLuong = data.reduce((sum, item) => sum + Number(item.SanLuong || 0), 0);
    const totalSanLuongPrev = data.reduce((sum, item) => sum + Number(item.SanLuong_Prev || 0), 0);
    const totalTienNuoc = data.reduce((sum, item) => sum + Number(item.TienNuoc || 0), 0);
    // const totalDoanhThu = data.reduce((sum, item) => sum + Number(item.DoanhThu || 0), 0); // Optional based on old app
    const totalTangGiam = totalSanLuong - totalSanLuongPrev;

    // Calculate % Change
    let pctChange = 0;
    if (totalSanLuongPrev > 0) {
        pctChange = (totalTangGiam / totalSanLuongPrev) * 100;
    } else if (totalSanLuong > 0) {
        pctChange = 100; // New growth
    }

    return (
        <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 px-1">
                Tổng Quan Kỳ {ky}/{nam}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Tổng Số Lượng"
                    value={totalSoLuong}
                    iconPath={<Users className="w-5 h-5 text-blue-600" />}
                    gradientColor="blue"
                    description="Tổng số danh bạ"
                />

                <MetricCard
                    title="Tổng Sản Lượng"
                    value={totalSanLuong}
                    subValueLabel={totalTangGiam >= 0 ? "Tăng" : "Giảm"}
                    subValue={Math.abs(totalTangGiam)}
                    trendMode="normal"
                    prevValue={totalSanLuongPrev} 
                    iconPath={<Droplet className="w-5 h-5 text-emerald-600" />}
                    gradientColor="emerald"
                    description={`${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}% so với cùng kỳ`}
                />

                <MetricCard
                    title="Tổng Tiền Nước"
                    value={`${totalTienNuoc.toLocaleString()} ₫`}
                    iconPath={<Banknote className="w-5 h-5 text-indigo-600" />}
                    gradientColor="indigo"
                    description="Chưa bao gồm thuế/phí"
                />

                <MetricCard
                    title="% Thay Đổi"
                    value={`${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}%`}
                    iconPath={<TrendingUp className="w-5 h-5 text-orange-600" />}
                    gradientColor="orange"
                    trendMode="normal"
                    description={`So với Kỳ ${ky}/${nam-1}`}
                />
            </div>
        </div>
    );
}
