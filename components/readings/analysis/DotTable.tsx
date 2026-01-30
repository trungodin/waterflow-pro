
import React from 'react';
import { DotAnalysisData } from '@/app/readings/analysis-actions';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DotTableProps {
    data: DotAnalysisData[];
    ky: number;
    nam: number;
}

export default function DotTable({ data, ky, nam }: DotTableProps) {
    if (!data || data.length === 0) return null;

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData = data.map(item => ({
            'Đợt': item.Dot,
            'Số Lượng': item.SoLuong,
            'Sản Lượng': item.SanLuong,
            'Sản Lượng (Năm Trước)': item.SanLuong_Prev,
            'Tăng/Giảm': item.TangGiam,
            'Tiền Nước': item.TienNuoc,
            'Doanh Thu': item.DoanhThu,
            'Ngày Đọc': item.NgayDoc
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        
        // Auto-width
        const cols = Object.keys(wsData[0]).map(key => ({ wch: 15 }));
        ws['!cols'] = cols;

        XLSX.utils.book_append_sheet(wb, ws, `PhanTichDot_K${ky}_${nam}`);
        XLSX.writeFile(wb, `PhanTich_Dot_Ky${ky}_${nam}.xlsx`);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-gray-800">📋 Bảng Chi Tiết Theo Đợt</h3>
                <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200"
                >
                    <Download className="w-4 h-4" />
                    Xuất Excel
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-blue-700 text-white font-bold border-b border-blue-800 shadow-md">
                            <tr>
                                <th className="px-4 py-3 text-center w-16 text-white border-r border-blue-600">Đợt</th>
                                <th className="px-4 py-3 text-right text-white border-r border-blue-600">Số Lượng</th>
                                <th className="px-4 py-3 text-right text-white border-r border-blue-600">Sản Lượng (m³)</th>
                                <th className="px-4 py-3 text-right text-white border-r border-blue-600">Sản Lượng Năm Trước</th>
                                <th className="px-4 py-3 text-right text-white border-r border-blue-600">Tăng/Giảm</th>
                                <th className="px-4 py-3 text-right text-white border-r border-blue-600">Tiền Nước</th>
                                <th className="px-4 py-3 text-right text-white border-r border-blue-600">Doanh Thu</th>
                                <th className="px-4 py-3 text-center text-white">Ngày Đọc</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                            {data.map((row, idx) => (
                                <tr key={idx} className="odd:bg-white even:bg-blue-50 hover:bg-blue-100 transition-colors">
                                    <td className="px-4 py-3 text-center font-medium text-gray-900 border-r border-blue-200">{row.Dot}</td>
                                    <td className="px-4 py-3 text-right border-r border-blue-200">{row.SoLuong.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-600 border-r border-blue-200">
                                        {row.SanLuong.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500 border-r border-blue-200">
                                        {row.SanLuong_Prev.toLocaleString()}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-medium border-r border-blue-200 ${
                                        row.TangGiam > 0 ? 'text-green-600 bg-green-50' : 
                                        row.TangGiam < 0 ? 'text-red-600 bg-red-50' : 'text-gray-500'
                                    }`}>
                                        {row.TangGiam > 0 ? '+' : ''}{row.TangGiam.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right border-r border-blue-200">{row.TienNuoc.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right border-r border-blue-200">{row.DoanhThu.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-center text-gray-500">{row.NgayDoc}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-blue-100 font-bold text-blue-900 border-t border-blue-200">
                            <tr>
                                <td className="px-4 py-3 text-center">Tổng</td>
                                <td className="px-4 py-3 text-right">
                                    {data.reduce((sum, r) => sum + r.SoLuong, 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right text-blue-700">
                                    {data.reduce((sum, r) => sum + r.SanLuong, 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {data.reduce((sum, r) => sum + r.SanLuong_Prev, 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {data.reduce((sum, r) => sum + r.TangGiam, 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {data.reduce((sum, r) => sum + r.TienNuoc, 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {data.reduce((sum, r) => sum + r.DoanhThu, 0).toLocaleString()}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
