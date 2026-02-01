
'use client'

import dynamic from 'next/dynamic'
// @ts-ignore
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface ChartSectionProps {
  title: string | React.ReactNode
  data: any[]
  layout?: any
  chartType: 'line' | 'bar' | 'pie'
  height?: number
  // For Pie Chart specifically
  isPie?: boolean
  pieViewType?: 'GB' | 'Dot'
  onPieTypeChange?: (type: 'GB' | 'Dot') => void
  pieMetric?: 'Revenue' | 'Consumption'
  onPieMetricChange?: (metric: 'Revenue' | 'Consumption') => void
}

export default function ChartSection({
  title,
  data,
  layout,
  height = 350,
  isPie = false,
  pieViewType = 'GB',
  onPieTypeChange = () => { },
  pieMetric = 'Revenue',
  onPieMetricChange
}: ChartSectionProps) {

  const baseLayout = {
    font: { family: 'inherit', color: '#475569' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 20, b: 40, l: 60, r: 20 },
    autosize: true,
    legend: { orientation: 'h', y: 1.1 },
    ...layout
  }

  return (
    <section className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all border-none h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 min-h-[40px]">
        {typeof title === 'string' ? (
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        ) : (
          <div className="text-xl font-bold text-slate-800 w-full">{title}</div>
        )}

        {isPie && onPieMetricChange && (
          <div className="mr-2">
            <select
              value={pieMetric}
              onChange={(e) => onPieMetricChange(e.target.value as 'Revenue' | 'Consumption')}
              className="px-3 py-1 text-xs font-bold rounded-lg border border-gray-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            >
              <option value="Revenue">Doanh thu</option>
              <option value="Consumption">Sản lượng</option>
            </select>
          </div>
        )}

        {isPie && onPieTypeChange && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => onPieTypeChange('GB')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${pieViewType === 'GB' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Theo Giá Biểu
            </button>
            <button
              onClick={() => onPieTypeChange('Dot')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${pieViewType === 'Dot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Theo Đợt
            </button>
          </div>
        )}
      </div>

      <div className="w-full flex-grow relative" style={{ minHeight: height }}>
        <Plot
          data={data}
          layout={{
            ...baseLayout,
            height: height,
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>
    </section>
  )
}
