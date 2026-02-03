'use client'

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'

interface VirtualTableProps {
  data: any[]
  searchTerm: string
  formatCurrency: (val: string | number) => string | number
  isFlatMode?: boolean
  customColumns?: any[]
  selectedIds?: Set<string>
  onSelectionChange?: (id: string, checked: boolean) => void
  onRowClick?: (item: any) => void
}

// Default columns configuration - Generous widths to fit content automatically
const DEFAULT_COLUMNS = [
  { id: 'danhBa', label: 'Danh Bạ', width: 110 },
  { id: 'tenKH', label: 'Tên Khách Hàng', width: 350 },
  { id: 'soNha', label: 'Số Nhà', width: 100 },
  { id: 'duong', label: 'Đường', width: 250 },

  { id: 'tinhTrang', label: 'Tình Trạng', width: 110, align: 'center' },
  { id: 'tongKy', label: 'Kỳ', width: 50, align: 'center' },
  { id: 'tongNo', label: 'Tổng Nợ', width: 110, align: 'right' },
  { id: 'kyNam', label: 'Kỳ/Năm', width: 220 },
  { id: 'nhomKhoa', label: 'Nhóm Khóa', width: 110, align: 'center' },
  { id: 'ngayMo', label: 'Ngày Mở', width: 110, align: 'right' },
]

export default function VirtualDMNTable({
  data,
  searchTerm,
  formatCurrency,
  isFlatMode = false,
  customColumns,
  selectedIds,
  onSelectionChange,
  onRowClick
}: VirtualTableProps) {
  // --- Column Resizing Logic ---
  // Use custom columns if provided
  const [columns, setColumns] = useState(customColumns || DEFAULT_COLUMNS)

  // Ensure default columns are updated if customColumns prop changes (unlikely but safe)
  useEffect(() => {
    if (customColumns) setColumns(customColumns)
  }, [customColumns])

  const [isResizing, setIsResizing] = useState<string | null>(null)
  const resizingRef = useRef<{ startX: number, startWidth: number, colIndex: number } | null>(null)

  const startResizing = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault()
    setIsResizing(columns[colIndex].id)
    resizingRef.current = {
      startX: e.clientX,
      startWidth: columns[colIndex].width,
      colIndex
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return
    const { startX, startWidth, colIndex } = resizingRef.current
    const diff = e.clientX - startX
    const newWidth = Math.max(50, startWidth + diff)

    setColumns(prev => {
      const newCols = [...prev]
      newCols[colIndex] = { ...newCols[colIndex], width: newWidth }
      return newCols
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsResizing(null)
    resizingRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleMouseMove])

  // --- Data Grouping ---
  const groupedData = useMemo(() => {
    if (isFlatMode) return {} // Skip if flat mode

    return data.reduce((acc: Record<string, any[]>, item: any) => {
      let dateKey = item.NgayKhoa || 'Chưa xác định'
      if (dateKey.includes(' ')) dateKey = dateKey.split(' ')[0]

      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(item)
      return acc
    }, {} as Record<string, any[]>)
  }, [data, isFlatMode])

  const sortedDates = useMemo(() => {
    if (isFlatMode) return []
    return Object.keys(groupedData).sort((a, b) => {
      const parseDateVal = (d: string) => {
        if (!d || d === 'Chưa xác định') return 0
        try {
          const parts = d.split('/')
          if (parts.length === 3) {
            // Ensure YYYYMMDD format for correct integer comparison
            // parts[0] is day, parts[1] is month, parts[2] is year
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10)
            const year = parseInt(parts[2], 10)
            return year * 10000 + month * 100 + day
          }
        } catch (e) {
          return 0
        }
        return 0
      }
      return parseDateVal(b) - parseDateVal(a)
    })
  }, [groupedData, isFlatMode])

  const flattenedData = useMemo(() => {
    if (isFlatMode) {
      // Flat list without headers
      return data.map((item, idx) => ({
        type: 'row' as const,
        data: item,
        date: '',
        isEven: idx % 2 === 0
      }))
    }

    // Grouped list with headers
    const result: Array<{ type: 'header' | 'row', data: any, date?: string, isEven?: boolean }> = []

    sortedDates.forEach(date => {
      result.push({ type: 'header', data: { date }, date })
      groupedData[date].forEach((item: any, idx: number) => {
        result.push({ type: 'row', data: item, date, isEven: idx % 2 === 0 })
      })
    })

    return result
  }, [sortedDates, groupedData, isFlatMode, data])

  // --- Virtualization ---
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const totalWidth = useMemo(() => columns.reduce((acc, col) => acc + col.width, 0), [columns])
  const gridTemplate = useMemo(() => columns.map(col => `${col.width}px`).join(' '), [columns])
  const itemHeight = 36 // Row height
  const containerHeight = 600
  const totalHeight = flattenedData.length * itemHeight

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5)
  const endIndex = Math.min(
    flattenedData.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + 5
  )

  const visibleItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({
      index: i,
      ...flattenedData[i]
    })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  // --- Rendering ---
  const renderRow = (item: any, index: number) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      // If flat mode, index is correct. If grouped, index includes headers.
      // Since virtual list provides linear index, top is correct.
      top: index * itemHeight,
      left: 0,
      width: totalWidth,
      height: itemHeight,
    }

    if (item.type === 'header') {
      const count = groupedData[item.date!].length
      const total = groupedData[item.date!].reduce((sum: number, d: any) => {
        const val = parseFloat(String(d.TongNo || '0').replace(/[.,]/g, ''))
        return sum + (isNaN(val) ? 0 : val)
      }, 0)

      return (
        <div key={index} style={style} className="bg-blue-100 border-y border-blue-300 px-4 flex justify-between items-center z-10 sticky left-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-700">📅</span>
            <span className="font-bold text-blue-900 text-sm">Ngày khóa: {item.date}</span>
          </div>
          <div className="text-xs font-medium text-blue-900">
            <span className="font-bold">{count}</span> khách hàng • Tổng nợ: <span className="font-bold text-red-700">{formatCurrency(total)} VNĐ</span>
          </div>
        </div>
      )
    }

    const row = item.data

    // Status Logic
    const statusLower = (row.TinhTrang || '').toLowerCase()
    const isKhoa = statusLower.includes('khóa') || statusLower.includes('khoá') || statusLower.includes('đóng')
    const isMo = statusLower.includes('mở') || statusLower.includes('mo') || statusLower.includes('bình thường')

    let statusClass = "bg-gray-100 text-gray-700 border border-gray-300"
    if (isKhoa) statusClass = "bg-red-50 text-red-700 border border-red-200 font-bold"
    if (isMo && !isKhoa) statusClass = "bg-green-50 text-green-700 border border-green-200 font-bold"

    // Zebra striping: bg-white for odd, bg-gray-50 for even (or vice versa based on index logic)
    const rowBgClass = item.isEven ? 'bg-white' : 'bg-[#f4f7f9]'

    return (
      <div
        key={index}
        style={style}
        onClick={() => onRowClick && onRowClick(row)}
        className={`border-b border-gray-300 hover:bg-yellow-50 transition-colors flex items-center ${rowBgClass} ${onRowClick ? 'cursor-pointer' : ''}`}
      >
        <div
          className="grid items-center h-full"
          style={{
            gridTemplateColumns: gridTemplate,
            width: totalWidth
          }}
        >
          {columns.map((col, idx) => {
            // Add vertical borders between columns
            const cellStyle = "px-2 truncate text-xs " + (col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left')
            const borderR = idx !== columns.length - 1 ? " border-r border-gray-300" : ""

            let content = null

            // Handle Special Columns based on ID
            switch (col.id) {
              case 'stt': content = <span className="text-gray-500 font-medium">{index + 1}</span>; break;
              case 'select':
                content = (
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(row.DanhBa) || false}
                    onChange={(e) => onSelectionChange?.(row.DanhBa, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                );
                break;

              case 'danhBa': content = <span className="font-mono font-bold text-gray-900">{row.DanhBa}</span>; break;
              case 'tenKH': content = <span className="font-semibold text-gray-900" title={row.TenKH}>{row.TenKH}</span>; break;
              case 'soNha': content = <span className="text-gray-800" title={row.SoNha}>{row.SoNha}</span>; break;
              case 'duong': content = <span className="text-gray-800" title={row.Duong}>{row.Duong}</span>; break;
              case 'gb': content = <span className="text-center block font-bold text-gray-700">{row.GB}</span>; break;


              case 'tinhTrang':
                content = (
                  <span className={`px-2 py-0.5 rounded text-[11px] inline-block w-full truncate shadow-sm ${statusClass}`}>
                    {row.TinhTrang || 'N/A'}
                  </span>
                )
                break;

              case 'tongKy': content = <span className="font-bold text-gray-900">{row.TongKy || '0'}</span>; break;
              case 'tongNo': content = <span className="font-bold text-black">{formatCurrency(row.TongNo)}</span>; break;
              case 'kyNam': content = <span className="text-gray-600 font-medium text-[11px]" title={row.KyNam}>{row.KyNam || 'N/A'}</span>; break;

              // New Columns for Report
              case 'mlt2': content = <span className="font-mono text-gray-700">{row.MLT2}</span>; break;
              case 'soMoi': content = <span className="text-gray-600 italic">{row.SoMoi}</span>; break;
              case 'soThan': content = <span className="text-gray-600 font-medium text-[13px]">{row.SoThan}</span>; break;

              case 'nhomKhoa': content = <span className="text-gray-700 font-medium">{row.NhomKhoa || '-'}</span>; break;
              case 'ngayMo': content = <span className="text-gray-700">{row.NgayMo || '-'}</span>; break;

              // Hidden columns by default
              case 'hieu': content = <span className="text-gray-700">{row.Hieu}</span>; break;
              case 'coCu': content = <span className="text-gray-700">{row.CoCu}</span>; break;
              case 'hopBaoVe':
                const hbv = row.HopBaoVe;
                let hbvDisplay = hbv;
                if (hbv === true || String(hbv).toLowerCase() === 'true') hbvDisplay = 'Có';
                else if (hbv === false || String(hbv).toLowerCase() === 'false') hbvDisplay = 'Không';
                content = <span className="text-gray-700">{hbvDisplay}</span>;
                break;
              case 'sdt': content = <span className="text-gray-700">{row.SDT}</span>; break;

              default: content = <span className="text-gray-700">{row[col.id] || ''}</span>
            }

            return (
              <div key={col.id} className={cellStyle + borderR + " h-full flex items-center"} style={{ justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                {content}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (flattenedData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-300">
        <p className="text-lg">Không tìm thấy dữ liệu</p>
        {searchTerm && <p className="text-sm mt-2">Thử tìm kiếm với từ khóa khác</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Scrollable Container Wrapper */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow flex flex-col">

        {/* Header */}
        <div className="overflow-x-hidden bg-gray-100 border-b border-gray-300" ref={(el) => {
          if (el && containerRef.current) {
            el.scrollLeft = containerRef.current.scrollLeft
          }
        }}>
          <div
            className="grid h-10 select-none relative"
            style={{
              gridTemplateColumns: gridTemplate,
              width: totalWidth
            }}
          >
            {columns.map((col, idx) => (
              <div
                key={col.id}
                className={`flex items-center px-2 text-[11px] font-extrabold text-gray-800 uppercase tracking-tight relative group h-full ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'} ${idx !== columns.length - 1 ? 'border-r border-gray-300' : ''}`}
              >
                {col.label}
                {/* Resizer Handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group-hover:bg-blue-300 z-20"
                  onMouseDown={(e) => startResizing(e, idx)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div
          ref={containerRef}
          className="overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 relative"
          style={{ height: containerHeight }}
          onScroll={(e) => {
            handleScroll(e)
            // Sync header scroll
            const header = e.currentTarget.previousElementSibling
            if (header) {
              header.scrollLeft = e.currentTarget.scrollLeft
            }
          }}
        >
          <div style={{ height: totalHeight, width: totalWidth, position: 'relative' }}>
            {visibleItems.map(item => renderRow(item, item.index))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm flex justify-between items-center text-sm">
        <div className="flex gap-6">
          <div>
            <span className="text-gray-600 font-medium mr-2">Tổng KH:</span>
            <span className="font-bold text-blue-800 text-lg">{data.length.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-600 font-medium mr-2">Ngày khóa:</span>
            <span className="font-bold text-blue-800 text-lg">{sortedDates.length}</span>
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-gray-600 font-medium mr-2">Tổng nợ:</span>
          <span className="font-bold text-gray-900 text-xl">
            {formatCurrency(data.reduce((sum, d) => {
              const val = parseFloat(String(d.TongNo || '0').replace(/[.,]/g, ''))
              return sum + (isNaN(val) ? 0 : val)
            }, 0))} VNĐ
          </span>
        </div>
      </div>
    </div>
  )
}
