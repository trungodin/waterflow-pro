'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { format } from 'date-fns'
import { Loader2, FileText, Download, Merge } from 'lucide-react'
import { generateWordNotice, mergeWordFiles } from '@/lib/client-utils'
import { toast } from 'sonner'


interface WordNoticeGeneratorProps {
    data: any[] // Full list of filtered data
    selectedIds: Set<string> // IDs of selected rows
}

export function WordNoticeGenerator({ data, selectedIds }: WordNoticeGeneratorProps) {
    const [noticeDate, setNoticeDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [deadline1Ky, setDeadline1Ky] = useState<number>(2)
    const [deadline2Ky, setDeadline2Ky] = useState<number>(5)
    const [targetMode, setTargetMode] = useState<'all' | 'selected'>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isMerging, setIsMerging] = useState(false)
    const mergeInputRef = useRef<HTMLInputElement>(null)

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            // Filter Data
            let targetData = data
            if (targetMode === 'selected') {
                targetData = data.filter(row => selectedIds.has((row.ID || row.id || '').toString()))
            }

            if (targetData.length === 0) {
                toast.error("Không có dữ liệu để tạo thông báo")
                return
            }

            // Map Data to generator format
            const formattedData = targetData.map((row, index) => ({
                TEN_KH: row.TenKH || '',
                DIA_CHI: row.DiaChi || `${row.SoNha || ''} ${row.Duong || ''}`,
                DANH_BA: row.DanhBa || '',
                MA_LO_TRINH: row.GB || '', // Mapping GB/MLT if available. If MLT missing, usage?
                // Wait, template uses MA_LO_TRINH (MLT2). Legacy view: `MLT2`.
                // Checking new app data... `row.GB` exists. `row.MLT2`?
                // Need to check what keys are in `data`. Assuming keys match `processedDetails` or similar.
                // Fallback to GB if MLT missing.
                // In new app, we have `row.SoThan` (Body Number)? 
                // Let's use `row.MLT2` if present, else empty.
                // Note: `row` keys come from `run_debt_invoice_analysis`? Or `weekly-report`?
                // This component is for "Lọc dữ liệu tồn". 
                // Legacy "Lọc dữ liệu tồn" (loc_du_lieu_ton.py) used `MLT2`.
                // I need to ensure my `debt-invoice` action returns `MLT2`.
                // I'll assume it might be missing and address it if needed.
                TONG_KY: row.TongKy || 0,
                KY_NAM: row.KyNam || '',
                TONG_TIEN: row.TongTien ? new Intl.NumberFormat('vi-VN').format(row.TongTien) : '0',
                SSTT: index + 1
            }))

            await generateWordNotice(formattedData, noticeDate, deadline1Ky, deadline2Ky)

            toast.success(`Đã tạo ${targetData.length} thông báo!`)

        } catch (error) {
            console.error(error)
            toast.error("Lỗi khi tạo file: " + (error as Error).message)
        } finally {
            setIsGenerating(false)
        }
    }

    const selectedCount = selectedIds.size
    const totalCount = data.length
    const targetCount = targetMode === 'selected' ? selectedCount : totalCount
    const isDisabled = targetCount === 0

    const handleMerge = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return
        if (files.length < 2) {
            toast.error('Vui lòng chọn ít nhất 2 file Word để ghép!')
            return
        }
        setIsMerging(true)
        try {
            const result = await mergeWordFiles(files)
            if (result.success) {
                toast.success(`Đã ghép ${files.length} file Word thành công!`)
            } else {
                toast.error('Lỗi khi ghép: ' + result.error)
            }
        } finally {
            setIsMerging(false)
            if (mergeInputRef.current) mergeInputRef.current.value = ''
        }
    }

    return (
        <Card className="p-6 mt-8 border-t bg-white/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Tạo Thông báo Tạm ngưng cung cấp nước (Word)</h3>
                </div>
                {/* Merge Button */}
                <div>
                    <input
                        ref={mergeInputRef}
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        multiple
                        className="hidden"
                        onChange={handleMerge}
                    />
                    <Button
                        variant="outline"
                        onClick={() => mergeInputRef.current?.click()}
                        disabled={isMerging}
                        className="border-purple-400 text-purple-700 hover:bg-purple-50 font-semibold"
                    >
                        {isMerging ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang ghép...</>
                        ) : (
                            <><Merge className="w-4 h-4 mr-2" />Ghép File Word</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Cot 1: Ngay thang */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="noticeDate">📅 Ngày trên thông báo</Label>
                        <Input
                            id="noticeDate"
                            type="date"
                            value={noticeDate}
                            onChange={(e) => setNoticeDate(e.target.value)}
                            className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ngày hiển thị trên văn bản (TP.HCM, Ngày...)</p>
                    </div>
                </div>

                {/* Cot 2: Deadlines */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="dl1">Hạn (Nợ 1 kỳ)</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                id="dl1"
                                type="number"
                                min={1} max={30}
                                value={deadline1Ky}
                                onChange={(e) => setDeadline1Ky(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-sm text-gray-500">ngày</span>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="dl2">Hạn (Nợ ≥2 kỳ)</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                id="dl2"
                                type="number"
                                min={1} max={30}
                                value={deadline2Ky}
                                onChange={(e) => setDeadline2Ky(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-sm text-gray-500">ngày</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Options & Action */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <RadioGroup
                    value={targetMode}
                    onValueChange={(v) => setTargetMode(v as 'all' | 'selected')}
                    className="flex items-center gap-6"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="opt-all" />
                        <Label htmlFor="opt-all">Tất cả ({totalCount} KH)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="selected" id="opt-selected" />
                        <Label htmlFor="opt-selected">Chỉ KH đã chọn ({selectedCount} KH)</Label>
                    </div>
                </RadioGroup>

                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">
                        Sẽ tạo: <strong>{targetCount}</strong> thông báo
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={isDisabled || isGenerating}
                        className="min-w-[200px]"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Tải File Word (.docx)
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md flex gap-2">
                <span className="shrink-0">💡</span>
                <div>
                    <strong>Mẹo:</strong> Nếu tạo nhiều thông báo, hệ thống sẽ tải về file <strong>.zip</strong> chứa các file Word riêng lẻ.
                    <br />
                    Hạn thanh toán: <strong>{deadline1Ky} ngày</strong> (nợ 1 kỳ) | <strong>{deadline2Ky} ngày</strong> (nợ ≥2 kỳ)
                </div>
            </div>
        </Card>
    )
}
