
import React, { useState } from 'react';
import { getReadingAnalysisByDot, DotAnalysisData } from '@/app/readings/analysis-actions';
import { Search } from 'lucide-react';
import DotStats from './DotStats';
import DotCharts from './DotCharts';
import DotTable from './DotTable';

export default function ReadingDotAnalysis() {
    const [ky, setKy] = useState<number>(new Date().getMonth() + 1);
    const [nam, setNam] = useState<number>(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DotAnalysisData[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    const handleLoadData = async () => {
        setLoading(true);
        try {
            const results = await getReadingAnalysisByDot(ky, nam);
            setData(results);
            setHasLoaded(true);
        } catch (error) {
            console.error("Failed to load dot analysis:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filter Section */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-bold text-gray-900">Chọn Kỳ</label>
                        <div className="relative">
                            <select 
                                value={ky}
                                onChange={(e) => setKy(Number(e.target.value))}
                                className="w-full h-11 pl-4 pr-10 rounded-lg border-2 border-gray-300 bg-gray-50 text-gray-900 font-semibold focus:border-blue-600 focus:ring-blue-600 transition-colors appearance-none cursor-pointer"
                            >
                                {Array.from({length: 12}, (_, i) => i + 1).map(k => (
                                    <option key={k} value={k}>Kỳ {k}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-bold text-gray-900">Chọn Năm</label>
                         <div className="relative">
                            <select 
                                value={nam}
                                onChange={(e) => setNam(Number(e.target.value))}
                                className="w-full h-11 pl-4 pr-10 rounded-lg border-2 border-gray-300 bg-gray-50 text-gray-900 font-semibold focus:border-blue-600 focus:ring-blue-600 transition-colors appearance-none cursor-pointer"
                            >
                                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i + 1).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex-none">
                        <button
                            onClick={handleLoadData}
                            disabled={loading}
                            className="h-11 px-8 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg flex items-center gap-2 transition-all disabled:opacity-70 shadow-md hover:shadow-lg transform active:scale-95"
                        >
                            {loading ? (
                                <>Running...</>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    Tải Dữ Liệu
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {hasLoaded && (
                <>
                    {/* 1. Stats Cards */}
                    <DotStats data={data} ky={ky} nam={nam} />

                     <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                        {/* 2. Charts */}
                        <DotCharts data={data} ky={ky} nam={nam} />

                        {/* 3. Table */}
                        <DotTable data={data} ky={ky} nam={nam} />
                    </div>
                </>
            )}

            {!hasLoaded && !loading && (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <Search className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có dữ liệu</h3>
                    <p className="text-gray-600 font-medium">👆 Vui lòng Chọn Kỳ, Năm và nhấn "Tải Dữ Liệu" để xem báo cáo chi tiết.</p>
                </div>
            )}
        </div>
    );
}
