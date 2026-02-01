/**
 * TypeScript Type Definitions for Charts and Dashboard Data
 */

// ============================================================================
// Plotly Chart Types
// ============================================================================

export interface PlotlyTrace {
    x: string[] | number[]
    y: (number | null)[]
    customdata?: (number | null)[]
    type: 'scatter' | 'bar' | 'pie'
    mode?: 'lines' | 'markers' | 'lines+markers'
    name?: string
    connectgaps?: boolean
    line?: {
        color: string
        width: number
    }
    marker?: {
        size?: number
        color?: string
    }
    text?: string[]
    textposition?: 'auto' | 'inside' | 'outside'
    textinfo?: 'percent' | 'value' | 'label'
    insidetextorientation?: 'horizontal' | 'radial'
    hovertemplate?: string
    values?: number[]
    labels?: string[]
}

export interface PlotlyLayout {
    yaxis?: {
        tickformat?: string
        ticksuffix?: string
        range?: number[]
    }
    xaxis?: {
        title?: string
        tickmode?: 'linear' | 'array'
        type?: 'category' | 'linear' | 'date'
    }
    barmode?: 'group' | 'stack'
    legend?: {
        orientation?: 'v' | 'h'
        x?: number
        y?: number
        xanchor?: 'left' | 'center' | 'right'
        yanchor?: 'top' | 'middle' | 'bottom'
    }
    margin?: {
        t?: number
        b?: number
        l?: number
        r?: number
    }
    uniformtext?: {
        minsize?: number
        mode?: 'hide' | 'show'
    }
}

// ============================================================================
// Dashboard KPI Data Types
// ============================================================================

export interface DashboardKPIData {
    // Revenue (Thu tiền)
    DoanhThu: number
    ThucThu: number
    DoanhThu_GB: number
    ThucThu_GB: number
    DoanhThu_Prev: number
    DoanhThu_GB_Prev: number

    // Production (Sản xuất)
    TongDHN_Current: number
    SanLuong_Current: number
    SanLuong_Prev: number
    SanLuong_Year: number
    SanLuong_Year_Prev: number
    DHN_BangKhong_Current: number
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface MonthlyRevenueData {
    Nam: number
    Ky: number
    DoanhThu: number
}

export interface MonthlyCollectionData {
    Nam: number
    Ky: number
    ThucThu: number
}

export interface MonthlyConsumptionData {
    Nam: number
    Ky: number
    SanLuong: number
}

export interface RevenueByPriceList {
    GB: string
    DoanhThu: number
}

export interface RevenueByDot {
    Dot: string
    DoanhThu: number
}

export interface PieChartData {
    values: number[]
    labels: string[]
    type: 'pie'
    textinfo: string
    textposition: string
    insidetextorientation: string
    hovertemplate: string
}

// ============================================================================
// Comparison Data Types
// ============================================================================

export interface ComparisonData {
    revenueData: MonthlyRevenueData[]
    collectionData: MonthlyCollectionData[]
    consumptionData: MonthlyConsumptionData[]
}

// ============================================================================
// Helper Types
// ============================================================================

export type ChartDataArray = PlotlyTrace[]
export type MonthlyDataValue = number | null
export type MonthlyDataArray = MonthlyDataValue[]
