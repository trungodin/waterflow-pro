'use client'

import { useState, useMemo } from 'react'
import VirtualDMNTable from './VirtualDMNTable'
import { getDebtData } from '../lib/actions/loc-du-lieu-ton'
import { generateWordNotice } from '../lib/client-utils'

interface LocDuLieuTonProps {
  formatCurrency: (val: string | number) => string | number
}

// Current Year/Month default
const now = new Date()
const DEFAULT_YEAR = now.getFullYear()
const DEFAULT_PERIOD = now.getMonth() + 1 // 1-12

// Custom Columns for Debt Report (Similar to Legacy App)
const REPORT_COLUMNS = [
  { id: 'stt', label: 'STT', width: 50, align: 'center' },
  { id: 'select', label: 'Chọn', width: 50, align: 'center' },
  { id: 'danhBa', label: 'DANHBA', width: 110, align: 'left' },
  { id: 'gb', label: 'GB', width: 50, align: 'center' },
  { id: 'tongNo', label: 'Tổng Cộng', width: 120, align: 'right' },
  { id: 'tongKy', label: 'T.Kỳ', width: 50, align: 'center' },
  { id: 'kyNam', label: 'KY_NAM', width: 100, align: 'left' },
  { id: 'tenKH', label: 'TENKH', width: 250, align: 'left' },
  { id: 'soNha', label: 'SO', width: 80, align: 'left' },
  { id: 'duong', label: 'DUONG', width: 200, align: 'left' },
  { id: 'mlt2', label: 'MLT2', width: 100, align: 'left' },
  { id: 'soMoi', label: 'SoMoi', width: 100, align: 'left' }, // Used for notes often
  { id: 'dot', label: 'DOT', width: 50, align: 'center' },
  { id: 'codeMoi', label: 'CodeMoi', width: 70, align: 'center' },
  { id: 'soThan', label: 'SoThan', width: 120, align: 'left' },
]

export default function LocDuLieuTon({ formatCurrency }: LocDuLieuTonProps) {
  // Input States
  const [nam, setNam] = useState<number>(DEFAULT_YEAR)
  const [ky, setKy] = useState<number>(DEFAULT_PERIOD)
  
  // Filter States
  const [minKy, setMinKy] = useState<string>('2')
  const [minNo, setMinNo] = useState<string>('0')
  const [excludeCodeMoi, setExcludeCodeMoi] = useState<string>('K, N, 66, K2, K3, NAN, F5, 63')
  const [dotFilter, setDotFilter] = useState<string>('') 
  const [gbFilter, setGbFilter] = useState<string>('') // e.g. "11, 13"
  const [fileDbList, setFileDbList] = useState<string[] | null>(null) // List from file
  const [fileFilterMode, setFileFilterMode] = useState<'include' | 'exclude'>('include') // Mode: include or exclude
  const [fileName, setFileName] = useState<string>('')
  
  const [searchTerm, setSearchTerm] = useState('')
  
  // Data States
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Word Generation States
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split('T')[0])
  const [deadline1Ky, setDeadline1Ky] = useState(2)
  const [deadline2Ky, setDeadline2Ky] = useState(5)

  // Selection Logic
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleSelectionChange = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) newSelected.add(id)
    else newSelected.delete(id)
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    // Note: use filteredData for selection logic
    if (filteredData.length === 0) return

    // Check if all filtered items are selected
    const allSelected = filteredData.every(d => selectedIds.has(d.DanhBa))
    
    if (allSelected) {
        // Deselect all visible
        setSelectedIds(new Set())
    } else {
        // Select all visible
        setSelectedIds(new Set(filteredData.map(d => d.DanhBa)))
    }
  }

  // Export Excel Logic
  const handleExportExcel = async () => {
    try {
        const XLSX = (await import('xlsx'))
        
        let dataToExport = filteredData
        if (selectedIds.size > 0) {
            dataToExport = filteredData.filter(d => selectedIds.has(d.DanhBa))
        }
        
        const mappedData = dataToExport.map((item, idx) => ({
            STT: idx + 1,
            DANHBA: item.DanhBa,
            TENKH: item.TenKH,
            DIACHI: `${item.SoNha || ''} ${item.Duong || ''}`.trim(),
            TONGKY: item.TongKy,
            TONGCONG: item.TongNo,
            KY_NAM: item.KyNam,
            MLT2: item.MLT2,
            CODEMOI: item.CodeMoi,
            DOT: item.Dot,
            SOTHAN: item.SoThan
        }))
        
        const ws = XLSX.utils.json_to_sheet(mappedData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "DanhSachNo")
        XLSX.writeFile(wb, `DanhSachTon_${nam}_${ky}.xlsx`)
        
    } catch(err) {
        console.error(err)
        setError("Lỗi khi xuất Excel")
    }
  }

  // Word Generation Handler
  const handleCreateWord = async () => {
    let dataToProcess = filteredData
    if (selectedIds.size > 0) {
        dataToProcess = filteredData.filter(d => selectedIds.has(d.DanhBa))
    }
    
    if (dataToProcess.length === 0) {
        setError("Chưa có dữ liệu nào để tạo thông báo!")
        return
    }

    setLoading(true)
    const res = await generateWordNotice(dataToProcess, noticeDate, deadline1Ky, deadline2Ky)
    setLoading(false)
    
    if (!res.success) {
        setError(res.error || "Lỗi tạo file Word")
    }
  }

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
        setFileDbList(null)
        setFileName('')
        return
    }
    
    setFileName(file.name)
    
    try {
        const XLSX = (await import('xlsx'))
        const reader = new FileReader()
        
        reader.onload = (evt) => {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
            
            let dbColIndex = -1
            const headerRow = rawData[0].map(c => String(c).toUpperCase())
            dbColIndex = headerRow.findIndex(h => h.includes('DANHBA') || h.includes('DANH BẠ'))
            
            if (dbColIndex === -1) dbColIndex = 0 
            
            const dbs = rawData.slice(1).map(r => String(r[dbColIndex])).filter(d => d && d.length >= 7) 
            
            setFileDbList(dbs)
        }
        
        reader.readAsBinaryString(file)
    } catch(err) {
        console.error("File parse error:", err)
        setError("Lỗi đọc file Excel")
    }
  }
  
  // Trigger Analysis
  const handleRunAnalysis = async () => {
    setLoading(true)
    setError(null)
    setData([])
    
    try {
        const dotList = dotFilter.split(',').map(s => s.trim()).filter(Boolean)
        const gbList = gbFilter.split(',').map(s => s.trim()).filter(Boolean)
        const codeMoiList = excludeCodeMoi.split(',').map(s => s.trim()).filter(Boolean)
        
        const result = await getDebtData({
            nam,
            ky,
            minTongKy: parseInt(minKy) || 0,
            minTongCong: parseFloat(minNo.replace(/[.,]/g, '')) || 0,
            excludeCodeMoi: codeMoiList,
            dotFilter: dotList,
            gbFilter: gbList,
            fileDbList: fileDbList || [],
            fileFilterMode: fileFilterMode,
            limit: 0 
        })
        
        setData(result)
        // Reset selection on new data
        setSelectedIds(new Set())
    } catch (err: any) {
        console.error(err)
        setError(err.message || 'Có lỗi xảy ra khi lấy dữ liệu')
    } finally {
        setLoading(false)
    }
  }

  // Client-side visual filtering
  const filteredData = useMemo(() => {
      if (!searchTerm) return data
      const term = searchTerm.toLowerCase()
      return data.filter(item => {
         const text = `${item.DanhBa} ${item.TenKH} ${item.SoNha} ${item.Duong}`.toLowerCase()
         return text.includes(term)
      })
  }, [data, searchTerm])

  const totalDebt = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.TongNo || 0), 0)
  }, [filteredData])


  return (
    <div className='flex flex-col h-full gap-4 animate-in fade-in duration-500'>
      {/* Filters Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
        
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2">
                <span className="text-blue-600 bg-blue-50 p-1.5 rounded-lg">⚙️</span> 
                Bộ Lọc Dữ Liệu Tồn (Phân tích chuyên sâu)
            </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          
           <div className="flex gap-2 lg:col-span-1">
             <div className="flex-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Năm</label>
                <input type="number" value={nam} onChange={e => setNam(parseInt(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center" />
             </div>
             <div className="flex-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Kỳ</label>
                <input type="number" value={ky} onChange={e => setKy(parseInt(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center" />
             </div>
           </div>

          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Số kỳ nợ tối thiểu</label>
            <div className="relative group">
                <input
                  type="number"
                  value={minKy}
                  onChange={(e) => setMinKy(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <span className="absolute right-3 top-2.5 text-gray-500 text-xs font-bold pointer-events-none">Kỳ</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tổng nợ tối thiểu</label>
             <div className="relative group">
                <input
                  type="number"
                  value={minNo}
                  onChange={(e) => setMinNo(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <span className="absolute right-3 top-2.5 text-gray-500 text-xs font-bold pointer-events-none">VNĐ</span>
             </div>
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Đợt (VD: 1, 2)</label>
            <input
                type="text"
                value={dotFilter}
                onChange={(e) => setDotFilter(e.target.value)}
                placeholder="Tất cả"
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Giá biểu (VD: 11, 13)</label>
            <input
                type="text"
                value={gbFilter}
                onChange={(e) => setGbFilter(e.target.value)}
                placeholder="Tất cả"
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-1">
             <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Lọc theo File (Excel)</label>
             <div className="relative">
                 <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                 />
                 <div className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 shadow-sm truncate flex items-center gap-2 hover:border-blue-400 transition-colors">
                    <span className="text-blue-600 font-bold">📂</span>
                    {fileName ? <span className="text-black">{fileName}</span> : <span className="text-gray-400">Chọn file...</span>}
                 </div>
                 {fileDbList && (
                    <span className="text-[10px] text-green-700 font-bold absolute -bottom-4 left-0 bg-green-50 px-1 rounded border border-green-200">
                        Đã nhận {fileDbList.length} DB
                    </span>
                 )}
             </div>
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-1">
             <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Chế độ File</label>
             <select
                value={fileFilterMode}
                onChange={(e) => setFileFilterMode(e.target.value as 'include' | 'exclude')}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
             >
                <option value="include">Thêm danh bạ</option>
                <option value="exclude">Loại trừ danh bạ</option>
             </select>
          </div>

           <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Loại trừ Code Mới</label>
            <input
                type="text"
                value={excludeCodeMoi}
                onChange={(e) => setExcludeCodeMoi(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          
           <div className="lg:col-span-6 flex gap-4 mt-2">
            <div className="relative group flex-1">
                <span className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">🔍</span>
                <input
                    type="text"
                    placeholder="Tìm nhanh trong kết quả (Tên, Danh bạ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none focus:border-blue-500 placeholder:text-gray-400"
                />
            </div>
            <button 
                onClick={handleRunAnalysis}
                disabled={loading}
                className={`px-6 py-2.5 rounded-lg text-white font-bold shadow-md transition-all flex items-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:translate-y-0.5'}`}
            >
                {loading ? <span className="animate-spin">⏳</span> : <span>⚡</span>} 
                {loading ? 'Đang phân tích...' : 'Lọc Dữ Liệu'}
            </button>
          </div>
        
        </div>
      </div>
      
      {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
          <div className="flex flex-wrap gap-6 text-sm items-center">
             <div className="text-gray-700 flex items-center gap-2">
                <span className="bg-white p-1.5 rounded-md shadow-sm text-blue-600 font-bold border border-blue-100">{filteredData.length}</span>
                <span className="text-gray-600 font-medium">KHÁCH HÀNG TỒN</span>
             </div>
             
             {selectedIds.size > 0 && (
                <>
                <div className="h-6 w-px bg-blue-200 hidden md:block"></div>
                <div className="text-gray-700 flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                    <span className="bg-blue-600 p-1.5 rounded-md shadow-sm text-white font-bold border border-blue-600">{selectedIds.size}</span>
                    <span className="text-blue-700 font-bold">ĐANG CHỌN</span>
                </div>
                </>
             )}

             <div className="h-6 w-px bg-blue-200 hidden md:block"></div>
             <div className="text-gray-700 flex items-center gap-2">
                <span className="bg-white p-1.5 rounded-md shadow-sm text-red-600 font-bold border border-red-100">{formatCurrency(totalDebt)}</span>
                <span className="text-gray-600 font-medium">TỔNG DƯ NỢ</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={toggleSelectAll}
                className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
             >
                {selectedIds.size === filteredData.length && filteredData.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
             </button>
             
            <button 
                onClick={handleExportExcel}
                className="px-4 py-2 bg-green-600 text-white border border-green-600 rounded-lg text-sm font-bold hover:bg-green-700 transition-all shadow-sm flex items-center gap-2"
            >
                <span>📥</span> Xuất Excel {selectedIds.size > 0 ? `(${selectedIds.size})` : 'Tất cả'}
            </button>
          </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 min-h-[500px] border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg shadow-gray-100/50">
         <VirtualDMNTable 
            data={filteredData} 
            searchTerm={''} 
            formatCurrency={formatCurrency} 
            isFlatMode={true}
            customColumns={REPORT_COLUMNS}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
         />
      </div>

       {/* Word Generation Panel */}
      <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col md:flex-row items-center gap-4 bg-blue-50/50">
        <h3 className="text-sm font-bold text-blue-800 uppercase flex items-center gap-2 min-w-max">
            <span className="text-blue-600 bg-white p-1 rounded border border-blue-100">📄</span> 
            Tạo Thông Báo
        </h3>
        
        <div className="h-8 w-px bg-blue-200 hidden md:block"></div>

        <div className="flex flex-wrap gap-4 items-center flex-1">
             <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700">Ngày in:</label>
                <input 
                    type="date" 
                    value={noticeDate} 
                    onChange={e => setNoticeDate(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
             </div>
             
             <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700">Hạn 1 kỳ:</label>
                <div className="relative w-24">
                    <input 
                        type="number" 
                        value={deadline1Ky} 
                        onChange={e => setDeadline1Ky(parseInt(e.target.value))}
                        className="w-full pl-2 pr-8 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                    <span className="absolute right-2 top-1.5 text-xs font-bold text-gray-500 pointer-events-none">ngày</span>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700">Hạn ≥2 kỳ:</label>
                 <div className="relative w-24">
                    <input 
                        type="number" 
                        value={deadline2Ky} 
                        onChange={e => setDeadline2Ky(parseInt(e.target.value))}
                        className="w-full pl-2 pr-8 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-bold text-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                     <span className="absolute right-2 top-1.5 text-xs font-bold text-gray-500 pointer-events-none">ngày</span>
                </div>
             </div>
        </div>
        
        <button 
            onClick={handleCreateWord}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white border border-blue-600 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
            <span>📝</span> Tạo {selectedIds.size > 0 ? selectedIds.size : filteredData.length} Thông Báo
        </button>
      </div>
    </div>
  )
}
