'use client'

import { useState, useEffect } from 'react'
import { getReadingFilters, ReadingFilters } from '@/app/readings/actions'
import Select from 'react-select'

interface FilterProps {
  onSearch: (filters: ReadingFilters) => void
  loading: boolean
}

export default function ReadingFiltersComponent({ onSearch, loading }: FilterProps) {
    // Filter State
    const now = new Date()
    const [kyFrom, setKyFrom] = useState(now.getMonth() + 1)
    const [namFrom, setNamFrom] = useState(now.getFullYear())
    const [kyTo, setKyTo] = useState<number | undefined>(undefined)
    const [namTo, setNamTo] = useState<number | undefined>(undefined)

    const [gbOp, setGbOp] = useState("Tất cả")
    const [gbVal, setGbVal] = useState("")
    
    const [ttmOp, setTtmOp] = useState("Tất cả")
    const [ttmVal, setTtmVal] = useState<number | undefined>(undefined)

    const [ttlOp, setTtlOp] = useState("Tất cả")
    const [ttlVal, setTtlVal] = useState<number | undefined>(undefined)

    // Option State
    const [filterOptions, setFilterOptions] = useState<any>({})
    const [loadingOptions, setLoadingOptions] = useState(true)

    // Dropdown States
    const [cocu, setCocu] = useState("Tất cả")
    const [dot, setDot] = useState<any>("Tất cả")
    const [hieucu, setHieucu] = useState("Tất cả")
    const [codemoi, setCodemoi] = useState("Tất cả")
    const [hopbaove, setHopbaove] = useState("Tất cả")
    const [congdung, setCongdung] = useState<string[]>([]) // Multiselect simulation

    const [limit, setLimit] = useState(200)

    useEffect(() => {
        const fetchOpts = async () => {
            setLoadingOptions(true)
            const opts = await getReadingFilters()
            setFilterOptions(opts)
            setLoadingOptions(false)
        }
        fetchOpts()
    }, [])

    const handleSearch = () => {
        const filters: ReadingFilters = {
            ky_from: kyFrom,
            nam_from: namFrom,
            ky_to: kyTo || undefined, // Allow empty 
            nam_to: namTo || undefined,
            gb_op: gbOp,
            gb_val: gbVal,
            ttm_op: ttmOp,
            ttm_val: ttmVal,
            ttl_op: ttlOp,
            ttl_val: ttlVal,
            cocu: cocu,
            dot: dot === "Tất cả" ? undefined : Number(dot),
            hieucu: hieucu,
            codemoi: codemoi,
            hopbaove: hopbaove,
            congdung: congdung.length > 0 ? congdung : undefined,
            limit: limit
        }
        onSearch(filters)
    }

    const operators = ["Tất cả", "=", ">", "<", ">=", "<="]

    return (
        <div className="bg-white p-5 rounded-xl border-2 border-gray-400 shadow-lg mb-6 max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-black mb-5 flex items-center gap-2 text-xl border-b-2 border-gray-200 pb-2">
                ⚙️ Bộ Lọc Dữ Liệu
            </h3>

            {/* 1. Time Filters */}
            <div className="mb-5">
                <h4 className="text-sm font-black text-blue-800 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-700 rounded-full inline-block"></span>
                    Thời Gian
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Từ Kỳ</label>
                        <input type="number" min="1" max="12" value={kyFrom} onChange={e => setKyFrom(Number(e.target.value))} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Từ Năm</label>
                        <input type="number" min="2020" max="2099" value={namFrom} onChange={e => setNamFrom(Number(e.target.value))} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors" />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Đến Kỳ (Tùy chọn)</label>
                        <input type="number" min="1" max="12" value={kyTo || ''} placeholder="-" onChange={e => setKyTo(e.target.value ? Number(e.target.value) : undefined)} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors placeholder:font-normal" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Đến Năm (Tùy chọn)</label>
                        <input type="number" min="2020" max="2099" value={namTo || ''} placeholder="-" onChange={e => setNamTo(e.target.value ? Number(e.target.value) : undefined)} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors placeholder:font-normal" />
                    </div>
                </div>
            </div>
            
            <hr className="my-5 border-gray-300 border-dashed"/>

            {/* 2. Attribute Filters (GB, TTM, TTL) */}
            <div className="mb-5">
                <h4 className="text-sm font-black text-blue-800 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-700 rounded-full inline-block"></span>
                    Thuộc Tính (Giá, Tiêu Thụ)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* GB */}
                    <div className="flex gap-2 items-end">
                        <div className="w-1/3">
                            <label className="block text-xs font-bold text-black mb-1.5">Giá Biểu (GB)</label>
                            <select value={gbOp} onChange={e => setGbOp(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                                {operators.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                        </div>
                        <div className="w-2/3">
                           <input type="text" value={gbVal} onChange={e => setGbVal(e.target.value)} placeholder="Nhập giá trị..." disabled={gbOp === "Tất cả"} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black disabled:bg-gray-200 placeholder:font-normal focus:border-blue-600 focus:ring-1 focus:ring-blue-600" />
                        </div>
                    </div>
                    {/* TTM */}
                    <div className="flex gap-2 items-end">
                        <div className="w-1/3">
                            <label className="block text-xs font-bold text-black mb-1.5">Tiêu Thụ Mới</label>
                            <select value={ttmOp} onChange={e => setTtmOp(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                                {operators.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                        </div>
                        <div className="w-2/3">
                             <input type="number" value={ttmVal || ''} onChange={e => setTtmVal(e.target.value ? Number(e.target.value) : undefined)} placeholder="Nhập số..." disabled={ttmOp === "Tất cả"} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black disabled:bg-gray-200 placeholder:font-normal focus:border-blue-600 focus:ring-1 focus:ring-blue-600" />
                        </div>
                    </div>
                    {/* TTL */}
                    <div className="flex gap-2 items-end">
                        <div className="w-1/3">
                            <label className="block text-xs font-bold text-black mb-1.5">Tiêu Thụ Lệch</label>
                            <select value={ttlOp} onChange={e => setTtlOp(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                                {operators.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                        </div>
                        <div className="w-2/3">
                            <input type="number" value={ttlVal || ''} onChange={e => setTtlVal(e.target.value ? Number(e.target.value) : undefined)} placeholder="Nhập số..." disabled={ttlOp === "Tất cả"} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black disabled:bg-gray-200 placeholder:font-normal focus:border-blue-600 focus:ring-1 focus:ring-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            <hr className="my-5 border-gray-300 border-dashed"/>

            {/* 3. Dropdown Filters */}
            <div className="mb-6">
                <h4 className="text-sm font-black text-blue-800 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-700 rounded-full inline-block"></span>
                    Chi Tiết
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Cỡ Cũ</label>
                        <select value={cocu} onChange={e => setCocu(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                            <option value="Tất cả">Tất cả</option>
                            {filterOptions.CoCu?.map((o: string, idx: number) => <option key={`${o}-${idx}`} value={o}>{o}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Đợt</label>
                        <select value={dot} onChange={e => setDot(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                            <option value="Tất cả">Tất cả</option>
                            {filterOptions.Dot?.map((o: any) => <option key={o} value={o}>{o}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Hiệu Cũ</label>
                        <select value={hieucu} onChange={e => setHieucu(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                            <option value="Tất cả">Tất cả</option>
                            {filterOptions.HieuCu?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Code Mới</label>
                        <select value={codemoi} onChange={e => setCodemoi(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                            <option value="Tất cả">Tất cả</option>
                            {filterOptions.CodeMoi?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-black mb-1.5">Hộp Bảo Vệ</label>
                        <select value={hopbaove} onChange={e => setHopbaove(e.target.value)} className="w-full border-2 border-gray-400 rounded-md px-2 py-2 text-sm font-bold text-black focus:border-blue-600">
                            <option value="Tất cả">Tất cả</option>
                            {filterOptions.HopBaoVe?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                     </div>
                     <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-xs font-bold text-black mb-1.5">Công Dụng</label>
                        <Select 
                            instanceId="reading-filters-congdung"
                            isMulti
                            options={filterOptions.CongDung?.map((o: string) => ({ value: o, label: o }))}
                            value={congdung.map((val: string) => ({ value: val, label: val }))}
                            onChange={(selected: any) => {
                                setCongdung(selected ? selected.map((s: any) => s.value) : [])
                            }}
                            placeholder="Chọn..."
                            className="text-sm font-bold text-black"
                            styles={{
                                control: (base: any) => ({
                                    ...base,
                                    borderColor: '#9ca3af', // gray-400
                                    borderWidth: '2px',
                                    '&:hover': { borderColor: '#4b5563' }, // gray-600
                                    minHeight: '38px',
                                }),
                                menu: (base: any) => ({ ...base, zIndex: 9999, color: '#000' }),
                                option: (base: any, state: any) => ({
                                    ...base,
                                    backgroundColor: state.isSelected ? '#2563eb' : 'white',
                                    color: state.isSelected ? 'white' : 'black',
                                })
                            }}
                        />
                     </div>
                </div>
            </div>
            
            <div className="flex items-end gap-4 border-t-2 border-gray-100 pt-5">
                 <div className="w-48">
                    <label className="block text-xs font-bold text-black mb-1.5">Giới hạn số dòng</label>
                    <input type="number" value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full border-2 border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-black focus:border-blue-600" />
                 </div>
                 <button 
                    onClick={handleSearch}
                    disabled={loading || loadingOptions}
                    className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm uppercase tracking-wide py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1"
                 >
                    {loading ? '⏳ Đang Tải Dữ Liệu...' : '🔍 Tải Dữ Liệu'}
                 </button>
            </div>
        </div>
    )
}
