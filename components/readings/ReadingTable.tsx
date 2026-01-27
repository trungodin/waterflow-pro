'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { ReadingFilters } from '@/app/readings/actions'

interface ReadingTableProps {
  data: any[]
  activeFilters?: ReadingFilters | null
  loading?: boolean
  hasSearched?: boolean
}

const formatNumber = (val: string | number) => {
    if (!val) return ''
    const num = Number(val)
    if (isNaN(num)) return val
    return new Intl.NumberFormat('vi-VN').format(num)
}

// Full list based on Python app's column_list
const FULL_COLUMNS = [
  { id: 'stt', label: 'STT', width: 50, align: 'center', defaultVisible: true },
  { id: 'mlt2', label: 'MLT2', width: 80, align: 'center', defaultVisible: true },
  { id: 'danhBa', label: 'Danh Bạ', width: 100, defaultVisible: true },
  { id: 'tenKH', label: 'Tên Khách Hàng', width: 250, defaultVisible: true },
  { id: 'soNha', label: 'Số Nhà', width: 100, defaultVisible: true },
  { id: 'duong', label: 'Đường', width: 200, defaultVisible: true },
  { id: 'sdt', label: 'SĐT', width: 100, defaultVisible: false },
  
  { id: 'gb', label: 'GB', width: 50, align: 'center', defaultVisible: true },
  { id: 'dm', label: 'ĐM', width: 50, align: 'center', defaultVisible: false },
  
  { id: 'kyNam', label: 'Kỳ/Năm', width: 80, align: 'center', defaultVisible: true },
  { id: 'dot', label: 'Đợt', width: 50, align: 'center', defaultVisible: true },
  { id: 'may', label: 'Máy', width: 50, align: 'center', defaultVisible: false },
  
  { id: 'tbtt', label: 'TBTT', width: 80, align: 'center', defaultVisible: false },
  { id: 'csCu', label: 'CS Cũ', width: 80, align: 'right', defaultVisible: false },
  { id: 'csMoi', label: 'CS Mới', width: 80, align: 'right', defaultVisible: false },
  { id: 'codeMoi', label: 'Code', width: 60, align: 'center', defaultVisible: true },
  { id: 'tieuThuCu', label: 'TT Cũ', width: 80, align: 'right', defaultVisible: true },
  { id: 'tieuThuMoi', label: 'TT Mới', width: 80, align: 'right', defaultVisible: true },
  { id: 'tieuThuLech', label: 'TT Lệch', width: 80, align: 'right', defaultVisible: true },
  
  { id: 'tuNgay', label: 'Từ Ngày', width: 90, align: 'center', defaultVisible: false },
  { id: 'denNgay', label: 'Đến Ngày', width: 90, align: 'center', defaultVisible: false },
  
  { id: 'tienNuoc', label: 'Tiền Nước', width: 100, align: 'right', defaultVisible: false },
  { id: 'bvmt', label: 'BVMT', width: 90, align: 'right', defaultVisible: false },
  { id: 'thue', label: 'Thuế', width: 90, align: 'right', defaultVisible: false },
  { id: 'tongTien', label: 'Tổng Tiền', width: 110, align: 'right', defaultVisible: true },
  
  { id: 'hopBaoVe', label: 'Hộp', width: 50, align: 'center', defaultVisible: true },
  { id: 'viTriCu', label: 'Vị Trí', width: 100, defaultVisible: false },
  { id: 'coCu', label: 'Cỡ', width: 50, align: 'center', defaultVisible: false },
  { id: 'hieuCu', label: 'Hiệu', width: 80, defaultVisible: false },
  { id: 'soThanCu', label: 'Số Thân', width: 100, defaultVisible: false },
  
  { id: 'congDungCu', label: 'Công Dụng Cũ', width: 150, defaultVisible: false },
  { id: 'congDungMoi', label: 'Công Dụng Mới', width: 150, defaultVisible: false },
  { id: 'congDung', label: 'Công Dụng KH', width: 150, defaultVisible: false },
  
  { id: 'ghiChuKH', label: 'Ghi Chú KH', width: 200, defaultVisible: true },
  { id: 'ghiChuDS', label: 'Ghi Chú DS', width: 200, defaultVisible: true },
  { id: 'ghiChuTV', label: 'Ghi Chú TV', width: 200, defaultVisible: false },
  
  { id: 'nvghi', label: 'NV Ghi', width: 120, defaultVisible: false },
  { id: 'gioGhi', label: 'Giờ Ghi', width: 120, defaultVisible: false },
]

export default function ReadingTable({ data, activeFilters }: ReadingTableProps) {
  // --- Column Visibility State ---
  const [visibleColIds, setVisibleColIds] = useState<Set<string>>(() => 
    new Set(FULL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id))
  )
  const [showColMenu, setShowColMenu] = useState(false)

  // --- Filtered Columns based on visibility ---
  const visibleColumns = useMemo(() => {
    return FULL_COLUMNS.filter(c => visibleColIds.has(c.id))
  }, [visibleColIds])

  // --- Column Resizing Logic ---
  // Store widths in a separate map to persist even when column is toggled off then on
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    FULL_COLUMNS.forEach(c => initial[c.id] = c.width)
    return initial
  })
  
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const resizingRef = useRef<{ startX: number, startWidth: number, colId: string } | null>(null)

  const startResizing = (e: React.MouseEvent, colId: string) => {
    e.preventDefault()
    setIsResizing(colId)
    resizingRef.current = {
      startX: e.clientX,
      startWidth: colWidths[colId],
      colId
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return
    const { startX, startWidth, colId } = resizingRef.current
    const diff = e.clientX - startX
    const newWidth = Math.max(50, startWidth + diff)

    setColWidths(prev => ({ ...prev, [colId]: newWidth }))
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsResizing(null)
    resizingRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleMouseMove])

  // --- Virtualization ---
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const visibleColsWithWidths = useMemo(() => visibleColumns.map(c => ({ ...c, width: colWidths[c.id] })), [visibleColumns, colWidths])
  const totalWidth = useMemo(() => visibleColsWithWidths.reduce((acc, col) => acc + col.width, 0), [visibleColsWithWidths])
  const gridTemplate = useMemo(() => visibleColsWithWidths.map(col => `${col.width}px`).join(' '), [visibleColsWithWidths])
  const itemHeight = 36
  const containerHeight = 600
  const totalHeight = data.length * itemHeight

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5)
  const endIndex = Math.min(
    data.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + 5
  )

  const visibleItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({ index: i, ...data[i] })
  }

  // --- Highlighting Logic ---
  const getCellStyle = (colId: string, row: any) => {
      if (!activeFilters) return ""
      const highlightClass = "bg-yellow-200 font-bold border-x border-yellow-300" 
      
      // Check filters
      if (colId === 'gb' && activeFilters.gb_op && activeFilters.gb_op !== "Tất cả" && activeFilters.gb_val) return highlightClass
      if (colId === 'tieuThuMoi' && activeFilters.ttm_op && activeFilters.ttm_op !== "Tất cả" && activeFilters.ttm_val !== undefined) return highlightClass
      if (colId === 'tieuThuLech' && activeFilters.ttl_op && activeFilters.ttl_op !== "Tất cả" && activeFilters.ttl_val !== undefined) return highlightClass
      if (colId === 'dot' && activeFilters.dot && activeFilters.dot !== ("Tất cả" as any)) return highlightClass
      if (colId === 'hopBaoVe' && activeFilters.hopbaove && activeFilters.hopbaove !== "Tất cả") return highlightClass
      if (colId === 'codeMoi' && activeFilters.codemoi && activeFilters.codemoi !== "Tất cả") return highlightClass
      
      return ""
  }

  const renderRow = (row: any, index: number) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      top: index * itemHeight,
      left: 0,
      width: totalWidth,
      height: itemHeight,
    }

    const isEven = index % 2 === 0
    const rowBgClass = isEven ? 'bg-white' : 'bg-[#f4f7f9]'

    return (
      <div key={index} style={style} className={`border-b border-gray-400 hover:bg-yellow-50 transition-colors flex items-center ${rowBgClass}`}>
        <div className="grid items-center h-full" style={{ gridTemplateColumns: gridTemplate, width: totalWidth }}>
          {visibleColsWithWidths.map((col, idx) => {
            const borderR = idx !== visibleColsWithWidths.length - 1 ? " border-r border-gray-400" : ""
            let content = null
            
            // Apply highlight style
            const highlight = getCellStyle(col.id, row)
            const cellBaseClass = `px-2 truncate text-xs h-full flex items-center ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'} ${borderR} ${highlight}`

            switch(col.id) {
                case 'stt': content = <span className="font-bold text-gray-900">{index + 1}</span>; break;
                // Mappings based on SQL column names often PascalCase in JS if raw from DB, or mapped in action.ts
                // In action.ts: "DanhBa", "TenKH", "SoNhaCu", "Duong", "SDT", "GB", "DM", "Nam", "Ky", "Dot", "May"...
                // Let's assume result keys match what we fetch.
                case 'danhBa': 
                    const db = row.DanhBa ? row.DanhBa.toString().padStart(11, '0') : ''
                    content = <span className={`font-mono font-bold ${highlight || 'text-black'}`}>{db}</span>
                    break;
                case 'mlt2': content = <span className="font-mono text-gray-900">{row.MLT2}</span>; break;
                case 'tenKH': content = <span className="font-bold text-gray-900" title={row.TenKH}>{row.TenKH}</span>; break;
                case 'soNha': content = <span className="text-gray-900 font-medium" title={row.SoNhaCu}>{row.SoNhaCu}</span>; break; 
                case 'duong': content = <span className="text-gray-900 font-medium" title={row.Duong}>{row.Duong}</span>; break;
                case 'sdt': content = <span className="text-gray-900">{row.SDT}</span>; break;
                
                case 'gb': content = <span className="font-bold text-black">{row.GB}</span>; break;
                case 'dm': content = <span className="text-gray-900">{row.DM}</span>; break;
                case 'kyNam': content = <span className="font-medium text-gray-800">{`${row.Ky?.toString().padStart(2,'0')}/${row.Nam}`}</span>; break;
                case 'dot': content = <span className="font-bold text-black">{row.Dot}</span>; break;
                case 'may': content = <span className="text-gray-900">{row.May}</span>; break;
                
                case 'tbtt': content = <span className="text-gray-900">{row.TBTT}</span>; break;
                case 'csCu': content = <span className="text-gray-700">{formatNumber(row.CSCu)}</span>; break;
                case 'csMoi': content = <span className="text-gray-900 font-medium">{formatNumber(row.CSMoi)}</span>; break;
                case 'codeMoi': content = <span className="font-bold text-gray-900">{row.CodeMoi}</span>; break;
                case 'tieuThuCu': content = <span className="font-medium text-gray-700">{formatNumber(row.TieuThuCu)}</span>; break;
                case 'tieuThuMoi': content = <span className="font-bold text-blue-900">{formatNumber(row.TieuThuMoi)}</span>; break;
                case 'tieuThuLech': content = <span className="font-bold text-orange-700">{formatNumber(row.TieuThuLech)}</span>; break;
                
                case 'tuNgay': content = <span className="text-gray-900">{row.TuNgay}</span>; break;
                case 'denNgay': content = <span className="text-gray-900">{row.DenNgay}</span>; break;

                case 'tienNuoc': content = <span className="text-gray-900">{formatNumber(row.TienNuoc)}</span>; break;
                case 'bvmt': content = <span className="text-gray-900">{formatNumber(row.BVMT)}</span>; break;
                case 'thue': content = <span className="text-gray-900">{formatNumber(row.Thue)}</span>; break;
                case 'tongTien': content = <span className="font-bold text-red-700">{formatNumber(row.TongTien)}</span>; break;
                
                case 'hopBaoVe': 
                    const hbv = row.HopBaoVe
                    content = <span className="font-bold text-black">{hbv === 1 || hbv === true ? '✔' : (hbv === 0 || hbv === false ? '✘' : '')}</span>
                    break;
                case 'viTriCu': content = <span className="text-gray-900">{row.ViTriCu}</span>; break;
                case 'coCu': content = <span className="text-gray-900">{row.CoCu}</span>; break;
                case 'hieuCu': content = <span className="text-gray-900">{row.HieuCu}</span>; break;
                case 'soThanCu': content = <span className="text-gray-900">{row.SoThanCu}</span>; break;
                
                case 'congDungCu': content = <span className="text-gray-900">{row.CongDungCu}</span>; break;
                case 'congDungMoi': content = <span className="text-gray-900">{row.CongDungMoi}</span>; break;
                case 'congDung': content = <span className="text-gray-900">{row.CongDung}</span>; break;

                case 'ghiChuKH': content = <span className="text-gray-900 italic" title={row.GhiChuKH}>{row.GhiChuKH}</span>; break;
                case 'ghiChuDS': content = <span className="text-gray-900 italic" title={row.GhiChuDS}>{row.GhiChuDS}</span>; break;
                case 'ghiChuTV': content = <span className="text-gray-900 italic" title={row.GhiChuTV}>{row.GhiChuTV}</span>; break;
                
                case 'nvghi': content = <span className="text-gray-900">{row.NVGHI}</span>; break;
                case 'gioGhi': content = <span className="text-gray-900">{row.GioGhi}</span>; break;
                
                default: content = <span className="text-gray-900">{row[col.id] 
                   // Fallback to direct property access if id matches e.g. 'nvghi' -> row.NVGHI ? Case sensitivity might matter.
                   // The API returns PascalCase for most.
                   // Let's rely on standard mapping or direct match.
                   || row[col.id.charAt(0).toUpperCase() + col.id.slice(1)] 
                   || ''}</span>
            }

            return (
              <div key={col.id} className={cellBaseClass}>
                {content}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --- Render Visibility Menu ---
  const toggleColumn = (colId: string) => {
    setVisibleColIds(prev => {
        const next = new Set(prev)
        if (next.has(colId)) next.delete(colId)
        else next.add(colId)
        return next
    })
  }

  if (data.length === 0) return <div className="p-8 text-center text-gray-600 font-medium border-2 border-dashed border-gray-400 rounded-lg">Không có dữ liệu hiển thị</div>

  return (
    <div className="space-y-4">
         {/* Top Bar: Stats & Controls */}
         <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
             {/* Stats Area */}
             <div className="flex flex-wrap items-center gap-6 text-sm px-2">
                 <div>
                    <span className="text-gray-900 font-bold mr-2">Tổng dòng:</span>
                    <span className="font-extrabold text-blue-900">{data.length.toLocaleString()}</span>
                 </div>
                 <div className="w-px h-4 bg-gray-300"></div>
                 <div>
                    <span className="text-gray-900 font-bold mr-2">Tổng TT:</span>
                    <span className="font-extrabold text-blue-900">{formatNumber(data.reduce((sum, r) => sum + (Number(r.TieuThuMoi) || 0), 0))}</span>
                 </div>
                 <div className="w-px h-4 bg-gray-300"></div>
                 <div>
                    <span className="text-gray-900 font-bold mr-2">Tổng tiền:</span>
                    <span className="font-extrabold text-red-700">{formatNumber(data.reduce((sum, r) => sum + (Number(r.TongTien) || 0), 0))} VNĐ</span>
                 </div>
             </div>

             {/* Column Visibility Toggle */}
             <div className="relative">
                 <button 
                    onClick={() => setShowColMenu(!showColMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                    <span>👁️ Ẩn/Hiện cột</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                 </button>
                 
                 {showColMenu && (
                     <div className="absolute right-0 top-10 z-50 w-64 bg-white border border-gray-300 shadow-xl rounded-xl p-4 grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                        <div className="col-span-2 flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                             <span className="text-xs font-bold uppercase text-gray-500">Danh sách cột</span>
                             <button onClick={() => setShowColMenu(false)} className="text-gray-400 hover:text-red-500">✕</button>
                        </div>
                        {FULL_COLUMNS.map(col => (
                            <label key={col.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input 
                                    type="checkbox" 
                                    checked={visibleColIds.has(col.id)} 
                                    onChange={() => toggleColumn(col.id)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-xs font-medium text-gray-700 truncate" title={col.label}>{col.label}</span>
                            </label>
                        ))}
                     </div>
                 )}
                 
                 {showColMenu && <div className="fixed inset-0 z-40" onClick={() => setShowColMenu(false)}></div>}
             </div>
         </div>

         {/* Table Header & Body Wrapper */}
        <div className="border border-gray-400 rounded-lg overflow-hidden bg-white shadow flex flex-col">
            {/* Header */}
            <div className="overflow-x-hidden bg-gray-200 border-b border-gray-400" ref={(el) => { if (el && containerRef.current) el.scrollLeft = containerRef.current.scrollLeft }}>
                <div className="grid h-10 select-none relative" style={{ gridTemplateColumns: gridTemplate, width: totalWidth }}>
                    {visibleColsWithWidths.map((col, idx) => (
                        <div key={col.id} className={`flex items-center px-2 text-[11px] font-black text-black uppercase tracking-tight relative group h-full ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'} ${idx !== visibleColsWithWidths.length - 1 ? 'border-r border-gray-400' : ''}`}>
                            {col.label}
                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600 group-hover:bg-blue-400 z-20" onMouseDown={(e) => startResizing(e, col.id)} />
                        </div>
                    ))}
                </div>
            </div>

             {/* Body */}
            <div 
                ref={containerRef}
                className="overflow-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-200 relative"
                style={{ height: containerHeight }}
                onScroll={(e) => {
                    setScrollTop(e.currentTarget.scrollTop)
                     const header = e.currentTarget.previousElementSibling
                    if (header) header.scrollLeft = e.currentTarget.scrollLeft
                }}
            >
                <div style={{ height: totalHeight, width: totalWidth, position: 'relative' }}>
                    {visibleItems.map(item => renderRow(item, item.index))}
                </div>
            </div>
        </div>
    </div>
  )
}
