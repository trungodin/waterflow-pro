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
    const [isExpanded, setIsExpanded] = useState(false)

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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 transition-all duration-200">
            {/* Header / Toggle */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors rounded-xl select-none"
            >
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <span className="text-xl">⚙️</span> Bộ Lọc Dữ Liệu
                </h3>
                <button className="text-gray-500 hover:text-blue-600 transition-colors">
                    {isExpanded ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="p-5 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">

                    {/* 1. Time Filters */}
                    <div className="mb-5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full inline-block"></span>
                            Thời Gian
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Từ Kỳ</label>
                                <input type="number" min="1" max="12" value={kyFrom} onChange={e => setKyFrom(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Từ Năm</label>
                                <input type="number" min="2020" max="2099" value={namFrom} onChange={e => setNamFrom(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Đến Kỳ (Tùy chọn)</label>
                                <input type="number" min="1" max="12" value={kyTo || ''} placeholder="-" onChange={e => setKyTo(e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Đến Năm (Tùy chọn)</label>
                                <input type="number" min="2020" max="2099" value={namTo || ''} placeholder="-" onChange={e => setNamTo(e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 my-5"></div>

                    {/* 2. Attribute Filters (GB, TTM, TTL) */}
                    <div className="mb-5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full inline-block"></span>
                            Thuộc Tính
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* GB */}
                            <div className="flex gap-2 items-end">
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Giá Biểu (GB)</label>
                                    <select value={gbOp} onChange={e => setGbOp(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                        {operators.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                </div>
                                <div className="w-2/3">
                                    <input type="text" value={gbVal} onChange={e => setGbVal(e.target.value)} placeholder="Nhập giá trị..." disabled={gbOp === "Tất cả"} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                                </div>
                            </div>
                            {/* TTM */}
                            <div className="flex gap-2 items-end">
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Tiêu Thụ Mới</label>
                                    <select value={ttmOp} onChange={e => setTtmOp(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                        {operators.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                </div>
                                <div className="w-2/3">
                                    <input type="number" value={ttmVal || ''} onChange={e => setTtmVal(e.target.value ? Number(e.target.value) : undefined)} placeholder="Nhập số..." disabled={ttmOp === "Tất cả"} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                                </div>
                            </div>
                            {/* TTL */}
                            <div className="flex gap-2 items-end">
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Tiêu Thụ Lệch</label>
                                    <select value={ttlOp} onChange={e => setTtlOp(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                        {operators.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                </div>
                                <div className="w-2/3">
                                    <input type="number" value={ttlVal || ''} onChange={e => setTtlVal(e.target.value ? Number(e.target.value) : undefined)} placeholder="Nhập số..." disabled={ttlOp === "Tất cả"} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 my-5"></div>

                    {/* 3. Dropdown Filters */}
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full inline-block"></span>
                            Chi Tiết
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Cỡ Cũ</label>
                                <select value={cocu} onChange={e => setCocu(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                    <option value="Tất cả">Tất cả</option>
                                    {filterOptions.CoCu?.map((o: string, idx: number) => <option key={`${o}-${idx}`} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Đợt</label>
                                <select value={dot} onChange={e => setDot(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                    <option value="Tất cả">Tất cả</option>
                                    {filterOptions.Dot?.map((o: any) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Hiệu Cũ</label>
                                <select value={hieucu} onChange={e => setHieucu(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                    <option value="Tất cả">Tất cả</option>
                                    {filterOptions.HieuCu?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Code Mới</label>
                                <select value={codemoi} onChange={e => setCodemoi(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                    <option value="Tất cả">Tất cả</option>
                                    {filterOptions.CodeMoi?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Hộp Bảo Vệ</label>
                                <select value={hopbaove} onChange={e => setHopbaove(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                    <option value="Tất cả">Tất cả</option>
                                    {filterOptions.HopBaoVe?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2 lg:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Công Dụng</label>
                                <Select
                                    instanceId="reading-filters-congdung"
                                    isMulti
                                    options={filterOptions.CongDung?.map((o: string) => ({ value: o, label: o }))}
                                    value={congdung.map((val: string) => ({ value: val, label: val }))}
                                    onChange={(selected: any) => {
                                        setCongdung(selected ? selected.map((s: any) => s.value) : [])
                                    }}
                                    placeholder="Chọn..."
                                    className="text-sm text-gray-900"
                                    styles={{
                                        control: (base: any) => ({
                                            ...base,
                                            borderColor: '#d1d5db', // gray-300
                                            borderWidth: '1px',
                                            '&:hover': { borderColor: '#9ca3af' }, // gray-400
                                            minHeight: '38px',
                                            boxShadow: 'none',
                                            ':focus-within': {
                                                borderColor: '#3b82f6', // blue-500
                                                borderWidth: '1px',
                                            }
                                        }),
                                        menu: (base: any) => ({ ...base, zIndex: 9999, color: '#111827' }),
                                        option: (base: any, state: any) => ({
                                            ...base,
                                            backgroundColor: state.isSelected ? '#2563eb' : 'white',
                                            color: state.isSelected ? 'white' : '#111827',
                                            ':hover': {
                                                backgroundColor: state.isSelected ? '#2563eb' : '#f3f4f6',
                                            }
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-end gap-4 border-t border-gray-100 pt-5">
                        <div className="w-48">
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">Giới hạn số dòng</label>
                            <input type="number" value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading || loadingOptions}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wide py-2.5 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-70 active:translate-y-0.5"
                        >
                            {loading ? '⏳ Đang Tải...' : '🔍 Tìm Kiếm'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
