/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import PizZip from 'pizzip'
// @ts-ignore
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'

function formatDate(date: Date): string {
    const d = new Date(date)
    return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

export const generateWordNotice = async (
    customers: any[],
    noticeDateStr: string,
    deadline1Ky: number,
    deadline2Ky: number
) => {
    try {
        const templatePath = '/templates/thong_bao_template.docx'
        const response = await fetch(templatePath)
        
        if (!response.ok) {
            throw new Error('Không tìm thấy file mẫu thong_bao_template.docx trong thư mục public/templates.')
        }
        
        const content = await response.arrayBuffer()
        const zip = new PizZip(content)
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
        })

        const noticeDate = new Date(noticeDateStr)
        const deadline1Date = addDays(noticeDate, deadline1Ky)
        const deadline2Date = addDays(noticeDate, deadline2Ky)

        // Helper date parts
        const day = noticeDate.getDate()
        const month = noticeDate.getMonth() + 1
        const year = noticeDate.getFullYear()

        // Map data to template tags (Matching User's Template)
        const data = {
            customers: customers.map((c, idx) => ({
                STT: idx + 1,
                
                // Date placeholders
                NGAY: day,
                THANG: month,
                NAM: year,
                
                // Customer Info (with underscores as per template)
                DANH_BA: c.DanhBa,
                TEN_KH: c.TenKH,
                DIA_CHI: `${c.SoNha || ''} ${c.Duong || ''}`.trim(),
                MA_LO_TRINH: c.MLT2,
                
                // Debt Info
                TONG_KY: c.TongKy,
                KY_NAM: c.KyNam,
                TONG_TIEN: typeof c.TongNo === 'number' ? c.TongNo.toLocaleString('vi-VN') : c.TongNo,
                
                // Extra fields usually needed
                SOTHAN: c.SoThan,
                GB: c.GB,
                DOT: c.Dot,
                
                // Content fields
                TIEU_DE_THONG_BAO: "Về việc tạm ngưng dịch vụ cấp nước", // Default title
                NGAY_HAN: c.TongKy >= 2 ? formatDate(deadline2Date) : formatDate(deadline1Date)
            }))
        }

        doc.render(data)

        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        const fileName = `ThongBao_${noticeDateStr}_${customers.length}KH.docx`
        saveAs(out, fileName)
        
        return { success: true, fileName }

    } catch (error: any) {
        console.error("Error generating Word:", error)
        let errorMessage = error.message
        
        // Handle Docxtemplater specific errors
        if (error.properties && error.properties.errors instanceof Array) {
            const detailedErrors = error.properties.errors
                .map((e: any) => e.properties.explanation)
                .join('; ')
            errorMessage = `Lỗi Template: ${detailedErrors}`
            console.error("Template Detail Errors:", JSON.stringify(error.properties.errors, null, 2))
        }
        
        return { success: false, error: errorMessage }
    }
}
