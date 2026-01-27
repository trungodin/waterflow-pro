
export interface DashboardKPIData {
  DoanhThu: number;
  ThucThu: number;
  DoanhThu_GB: number;
  ThucThu_GB: number;
  DoanhThu_Prev: number;
  DoanhThu_GB_Prev: number;
  TongDHN_Current: number;
  SanLuong_Current: number;
  SanLuong_Prev: number;
  SanLuong_Year: number;
  SanLuong_Year_Prev: number;
  DHN_BangKhong_Current: number;
}

export interface ChartDataPoint {
  Nam: number;
  Ky: number;
  [key: string]: number; // Allow dynamic access like d['DoanhThu']
}

export interface ComparisonData {
  revenueData: ChartDataPoint[];
  collectionData: ChartDataPoint[];
  consumptionData: ChartDataPoint[];
}

export interface PieChartData {
  GB?: string;
  Dot?: string;
  DoanhThu: number;
}
