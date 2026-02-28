"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  LineChart,
} from "recharts";
import {
  getYearlyRevenue,
  getMonthlyRevenue,
  getDailyRevenue,
  YearlyRevenue,
  MonthlyRevenue,
  DailyRevenue,
} from "@/app/actions/revenue";
import { getRevenueCache, setRevenueCache } from "@/lib/revenue-cache";

// Format currency helper
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN").format(val);

export default function RevenueAnalysis() {
  const currentYear = new Date().getFullYear();

  // Caching initialization
  const cached = typeof window !== "undefined" ? getRevenueCache() : null;

  // Filters
  const [startYear, setStartYear] = useState(
    cached?.filters.startYear ?? currentYear - 2,
  );
  const [endYear, setEndYear] = useState(
    cached?.filters.endYear ?? currentYear,
  );
  const [dateUntil, setDateUntil] = useState(
    cached?.filters.dateUntil ?? new Date().toISOString().split("T")[0],
  );

  // Data States
  const [yearlyData, setYearlyData] = useState<YearlyRevenue[]>(
    cached?.data.yearlyData || [],
  );
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>(
    cached?.data.monthlyData || [],
  );
  const [dailyData, setDailyData] = useState<DailyRevenue[]>(
    cached?.data.dailyData || [],
  );

  // Loading States
  const [loadingYearly, setLoadingYearly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Selection States for Drill-down
  const [selectedYear, setSelectedYear] = useState<number | null>(
    cached?.state.selectedYear ?? null,
  );
  const [selectedKy, setSelectedKy] = useState<number | null>(
    cached?.state.selectedKy ?? null,
  );
  const [selectedYearForDaily, setSelectedYearForDaily] = useState<
    number | null
  >(cached?.state.selectedYearForDaily ?? null);

  // Active Tab Control
  const [activeTab, setActiveTab] = useState<"year" | "month" | "day">(
    cached?.state.activeTab ?? "year",
  );

  // Sync state to cache
  useEffect(() => {
    setRevenueCache({
      filters: { startYear, endYear, dateUntil },
      data: { yearlyData, monthlyData, dailyData },
      state: { activeTab, selectedYear, selectedKy, selectedYearForDaily },
    });
  }, [
    startYear,
    endYear,
    dateUntil,
    yearlyData,
    monthlyData,
    dailyData,
    activeTab,
    selectedYear,
    selectedKy,
    selectedYearForDaily,
  ]);

  // --- HANDLERS ---

  const handleRunAnalysis = async () => {
    setLoadingYearly(true);
    try {
      const data = await getYearlyRevenue(startYear, endYear, dateUntil);
      setYearlyData(data);
      // Reset lower levels
      setMonthlyData([]);
      setDailyData([]);
      setActiveTab("year");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tải dữ liệu năm");
    } finally {
      setLoadingYearly(false);
    }
  };

  const handleSelectYear = async (year: number) => {
    setSelectedYear(year);
    setActiveTab("month");
    setLoadingMonthly(true);
    try {
      const data = await getMonthlyRevenue(year);
      setMonthlyData(data);
      // Reset daily
      setDailyData([]);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tải dữ liệu tháng");
    } finally {
      setLoadingMonthly(false);
    }
  };

  const handleSelectKy = async (ky: number) => {
    if (!selectedYear) return;
    setSelectedKy(ky);
    setSelectedYearForDaily(selectedYear);
    setActiveTab("day");
    setLoadingDaily(true);
    try {
      const data = await getDailyRevenue(selectedYear, ky);
      setDailyData(data);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tải dữ liệu ngày");
    } finally {
      setLoadingDaily(false);
    }
  };

  // --- RENDER HELPERS ---

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-gray-700 shadow-lg rounded text-sm font-semibold text-gray-900">
          <p className="font-bold mb-2 border-b border-gray-200 pb-1">
            {label}
          </p>
          {payload.map((entry: any, index: number) => {
            const val = entry.value;
            let formattedVal = new Intl.NumberFormat("vi-VN").format(val);
            if (val >= 1000000000) {
              formattedVal =
                new Intl.NumberFormat("vi-VN", {
                  maximumFractionDigits: 2,
                }).format(val / 1000000000) + " Tỷ";
            } else if (val >= 1000000) {
              formattedVal =
                new Intl.NumberFormat("vi-VN", {
                  maximumFractionDigits: 2,
                }).format(val / 1000000) + " Triệu";
            }

            return (
              <p
                key={index}
                style={{ color: entry.color }}
                className="flex justify-between gap-4"
              >
                <span>{entry.name}:</span>
                <span>{formattedVal}</span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Sidebar / Filters Area */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Từ năm
          </label>
          <input
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
            className="w-24 px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đến năm
          </label>
          <input
            type="number"
            value={endYear}
            onChange={(e) => setEndYear(Number(e.target.value))}
            className="w-24 px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày giải ngân đến
          </label>
          <input
            type="date"
            value={dateUntil}
            onChange={(e) => setDateUntil(e.target.value)}
            className="px-3 py-2 border rounded-md text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={loadingYearly}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loadingYearly ? "Đang chạy..." : "Chạy Phân Tích"}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("year")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "year"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📊 Theo Năm
          </button>
          <button
            onClick={() => setActiveTab("month")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "month"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📅 Theo Kỳ {selectedYear ? `(${selectedYear})` : ""}
          </button>
          <button
            onClick={() => setActiveTab("day")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "day"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            🗓️ Theo Ngày{" "}
            {selectedKy && selectedYearForDaily
              ? `(Kỳ ${selectedKy}/${selectedYearForDaily})`
              : ""}
          </button>
        </nav>
      </div>

      {/* Content: Year Tab */}
      {activeTab === "year" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-blue-600 text-white select-none">
                <tr>
                  <th className="px-3 py-3 text-left font-bold border-r border-blue-500">
                    Năm
                  </th>
                  <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                    Chuẩn thu
                  </th>
                  <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                    Thực thu
                  </th>
                  <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                    Tồn thu
                  </th>
                  <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                    % Đạt
                  </th>
                  <th className="px-3 py-3 text-center font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {yearlyData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-gray-500"
                    >
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  yearlyData.map((row) => (
                    <tr
                      key={row.Nam}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-100">
                        {row.Nam}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 font-medium border-r border-gray-100">
                        {formatCurrency(row.TongDoanhThu)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700 font-bold border-r border-gray-100 bg-green-50">
                        {formatCurrency(row.TongThucThu)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 font-bold border-r border-gray-100 bg-red-50">
                        {formatCurrency(row.TonThu)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 border-r border-gray-100 bg-amber-50">
                        {row.PhanTramDat.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleSelectYear(row.Nam)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div className="bg-white p-4 border border-gray-200 rounded-lg h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={yearlyData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid stroke="#f5f5f5" />
                <XAxis dataKey="Nam" />
                <YAxis
                  tickFormatter={(val) =>
                    new Intl.NumberFormat("en", { notation: "compact" }).format(
                      val,
                    )
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="TongThucThu"
                  name="Thực thu"
                  stackId="a"
                  fill="#82ca9d"
                />
                <Bar
                  dataKey="TonThu"
                  name="Tồn thu"
                  stackId="a"
                  fill="#ff8042"
                />
                <Line
                  type="monotone"
                  dataKey="TongDoanhThu"
                  name="Chuẩn thu"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Content: Month Tab */}
      {activeTab === "month" && (
        <div className="space-y-4">
          {!selectedYear ? (
            <div className="text-center py-10 text-gray-500">
              Vui lòng chọn Năm ở tab trước để xem chi tiết.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-blue-600 text-white select-none">
                    <tr>
                      <th className="px-3 py-3 text-left font-bold border-r border-blue-500">
                        Kỳ
                      </th>
                      <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                        Chuẩn thu
                      </th>
                      <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                        Thực thu
                      </th>
                      <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                        Tồn thu
                      </th>
                      <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                        % Đạt
                      </th>
                      <th className="px-3 py-3 text-center font-bold">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-4 text-center text-gray-500"
                        >
                          Không có dữ liệu tháng
                        </td>
                      </tr>
                    ) : (
                      monthlyData.map((row) => (
                        <tr
                          key={row.Ky}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-100">
                            Kỳ {row.Ky}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 font-medium border-r border-gray-100">
                            {formatCurrency(row.TongDoanhThuKy)}
                          </td>
                          <td className="px-3 py-2 text-right text-green-700 font-bold border-r border-gray-100 bg-green-50">
                            {formatCurrency(row.TongThucThuThang)}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 font-bold border-r border-gray-100 bg-red-50">
                            {formatCurrency(row.TonThu)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900 border-r border-gray-100 bg-amber-50">
                            {row.PhanTramDat.toFixed(2)}%
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleSelectKy(row.Ky)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase transition-colors"
                            >
                              Xem ngày
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Chart - Side by Side Bar for Months */}
              <div className="bg-white p-4 border border-gray-200 rounded-lg h-[400px]">
                <h4 className="text-center font-bold mb-2">
                  Biểu đồ Kỳ - Năm {selectedYear}
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid stroke="#f5f5f5" />
                    <XAxis dataKey="Ky" />
                    <YAxis
                      tickFormatter={(val) =>
                        new Intl.NumberFormat("en", {
                          notation: "compact",
                        }).format(val)
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="TongDoanhThuKy"
                      name="Chuẩn thu"
                      fill="#8884d8"
                    />
                    <Bar
                      dataKey="TongThucThuThang"
                      name="Thực thu"
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content: Day Tab */}
      {activeTab === "day" && (
        <div className="space-y-4">
          {!selectedKy || !selectedYearForDaily ? (
            <div className="text-center py-10 text-gray-500">
              Vui lòng chọn Kỳ ở tab trước để xem chi tiết.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-blue-600 text-white select-none sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left font-bold border-r border-blue-500">
                        Ngày giải ngân
                      </th>
                      <th className="px-3 py-3 text-right font-bold border-r border-blue-500">
                        Số lượng HĐ
                      </th>
                      <th className="px-3 py-3 text-right font-bold">
                        Tổng cộng
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailyData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-center text-gray-500"
                        >
                          Không có dữ liệu ngày
                        </td>
                      </tr>
                    ) : (
                      dailyData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-100">
                            {new Date(row.NgayGiaiNgan).toLocaleDateString(
                              "vi-VN",
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 font-medium border-r border-gray-100 bg-orange-50">
                            {row.SoLuongHoaDon}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-blue-600 bg-green-50">
                            {formatCurrency(row.TongCongNgay)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Chart - Line Chart for Daily Revenue */}
              <div className="bg-white p-4 border border-gray-200 rounded-lg h-[400px]">
                <h4 className="text-center font-bold mb-2">
                  Thay đổi theo Ngày - Kỳ {selectedKy}/{selectedYearForDaily}
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid stroke="#f5f5f5" />
                    <XAxis
                      dataKey="NgayGiaiNgan"
                      tickFormatter={(dateStr) =>
                        new Date(dateStr).getDate().toString()
                      }
                      label={{
                        value: "Ngày",
                        position: "insideBottom",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      tickFormatter={(val) =>
                        new Intl.NumberFormat("en", {
                          notation: "compact",
                        }).format(val)
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="TongCongNgay"
                      name="Doanh thu ngày"
                      stroke="#0088FE"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
