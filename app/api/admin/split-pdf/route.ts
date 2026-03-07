import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const pdfFile = formData.get('pdf') as File | null
        const excelFile = formData.get('excel') as File | null
        const mode = (formData.get('mode') as string) || 'normal'   // 'normal' | 'no'
        const selectedMonth = formData.get('month') as string | null // VD: "3/2026" for Nợ mode

        if (!pdfFile || !excelFile) {
            return NextResponse.json({ error: 'Thiếu file PDF hoặc Excel' }, { status: 400 })
        }

        // 1. Read PDF
        const pdfBytes = await pdfFile.arrayBuffer()
        const pdfDoc = await PDFDocument.load(pdfBytes)
        const totalPages = pdfDoc.getPageCount()

        // 2. Read Excel
        const excelBytes = await excelFile.arrayBuffer()
        const workbook = XLSX.read(excelBytes, { type: 'buffer' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        let rows: any[] = XLSX.utils.sheet_to_json(sheet)

        // 3. Apply filter for "Nợ cũ" mode
        if (mode === 'no' && selectedMonth) {
            rows = rows.filter(row => {
                const soKyNo = Number(row['Số kỳ nợ'] ?? 0)
                const ghiChu = String(row['Ghi chú'] ?? '').trim()
                const cond1 = soKyNo > 1
                const cond2 = soKyNo === 1 && ghiChu !== selectedMonth
                return cond1 || cond2
            })
        }

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Không có dữ liệu sau khi lọc' }, { status: 400 })
        }

        if (rows.length > totalPages) {
            return NextResponse.json(
                { error: `Excel có ${rows.length} hàng nhưng PDF chỉ có ${totalPages} trang` },
                { status: 400 }
            )
        }

        // 4. Split PDF and pack into ZIP
        const zip = new JSZip()
        const suffix = mode === 'no' ? ' Nợ cũ' : ''

        for (let i = 0; i < rows.length; i++) {
            const danhBo = String(rows[i]['Danh bộ'] ?? '').trim()
            if (!danhBo) continue

            const singleDoc = await PDFDocument.create()
            const [copiedPage] = await singleDoc.copyPages(pdfDoc, [i])
            singleDoc.addPage(copiedPage)

            const singleBytes = await singleDoc.save()
            zip.file(`0${danhBo}${suffix}.pdf`, singleBytes)
        }

        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        })

        return new NextResponse(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="split_pdf_${mode}.zip"`,
                'Content-Length': zipBuffer.length.toString(),
            },
        })
    } catch (err: any) {
        console.error('[split-pdf]', err)
        return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 })
    }
}
