
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { DotAnalysisData } from '@/app/readings/analysis-actions';
import { BarChart, BadgeDollarSign, TrendingUpDown } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface DotChartsProps {
    data: DotAnalysisData[];
    ky: number;
    nam: number;
}

export default function DotCharts({ data, ky, nam }: DotChartsProps) {
    const [activeTab, setActiveTab] = useState<'sanluong' | 'doanhthu' | 'tanggiam'>('sanluong');

    if (!data || data.length === 0) return null;

    // Prepare Data Arrays
    const labels = data.map(item => `Đợt ${item.Dot}`);
    const sanLuongValues = data.map(item => item.SanLuong);
    const doanhThuValues = data.map(item => item.DoanhThu);
    const tangGiamValues = data.map(item => item.TangGiam);

    // Color logic for TangGiam
    const tangGiamColors = tangGiamValues.map(v => v >= 0 ? '#22c55e' : '#ef4444'); // green-500 : red-500

    const renderChart = () => {
        let plotData: any[] = [];
        let layout: any = {};

        const baseLayout = {
            autosize: true,
            margin: { t: 40, r: 20, l: 50, b: 80 },
            font: { family: 'Inter, sans-serif' },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            showlegend: false,
            xaxis: { 
                tickangle: -45,
                title: { text: "Đợt", standoff: 20 }
            }
        };

        if (activeTab === 'sanluong') {
            plotData = [{
                x: labels,
                y: sanLuongValues,
                type: 'bar',
                marker: { color: '#3b82f6', opacity: 0.8 }, // blue-500
                text: sanLuongValues.map(v => v.toLocaleString()),
                textposition: 'auto',
                hovertemplate: '<b>%{x}</b><br>Sản Lượng: %{y:,.0f} m³<extra></extra>'
            }];
            layout = {
                ...baseLayout,
                title: `Sản Lượng Theo Đợt - Kỳ ${ky}/${nam}`,
                yaxis: { title: 'Sản Lượng (m³)' }
            };
        } else if (activeTab === 'doanhthu') {
            plotData = [{
                x: labels,
                y: doanhThuValues,
                type: 'bar',
                marker: { color: '#6366f1', opacity: 0.8 }, // indigo-500
                text: doanhThuValues.map(v => (v/1000000).toFixed(1) + 'M'),
                textposition: 'auto',
                hovertemplate: '<b>%{x}</b><br>Doanh Thu: %{y:,.0f} VNĐ<extra></extra>'
            }];
            layout = {
                ...baseLayout,
                title: `Doanh Thu Theo Đợt - Kỳ ${ky}/${nam}`,
                yaxis: { title: 'Doanh Thu (VNĐ)' }
            };
        } else if (activeTab === 'tanggiam') {
            plotData = [{
                x: labels,
                y: tangGiamValues,
                type: 'bar',
                marker: { color: tangGiamColors, opacity: 0.9 },
                text: tangGiamValues.map(v => (v > 0 ? '+' : '') + v.toLocaleString()),
                textposition: 'auto',
                hovertemplate: '<b>%{x}</b><br>Tăng/Giảm: %{y:+,.0f} m³<extra></extra>'
            }];
            layout = {
                ...baseLayout,
                title: `Tăng/Giảm So Với Kỳ ${ky}/${nam-1}`,
                yaxis: { title: 'Tăng/Giảm (m³)' },
                shapes: [{
                    type: 'line',
                    x0: -0.5,
                    x1: labels.length - 0.5,
                    y0: 0,
                    y1: 0,
                    line: { color: 'gray', width: 1.5, dash: 'dot' }
                }]
            };
        }

        return (
            <div className="w-full h-[450px] bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                 <Plot
                    data={plotData}
                    layout={layout}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                />
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 px-1">📊 Biểu Đồ Phân Tích</h3>
            
            {/* Chart Tabs */}
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('sanluong')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'sanluong' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <BarChart className="w-4 h-4" />
                    Sản Lượng
                </button>
                <button
                    onClick={() => setActiveTab('doanhthu')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'doanhthu' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <BadgeDollarSign className="w-4 h-4" />
                    Doanh Thu
                </button>
                <button
                    onClick={() => setActiveTab('tanggiam')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'tanggiam' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <TrendingUpDown className="w-4 h-4" />
                    Tăng/Giảm
                </button>
            </div>

            {renderChart()}
        </div>
    );
}
