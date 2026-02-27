/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import PizZip from 'pizzip'
// @ts-ignore
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'

const PAGE_BREAK_XML = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`

/**
 * Ghép nhiều file .docx thành 1 file duy nhất (nối tiếp, không trang trắng, không corrupt)
 * Giữ nguyên cấu trúc file gốc, chỉ chèn content vào đúng vị trí
 */
export async function mergeWordFiles(files: File[]): Promise<{ success: boolean; error?: string }> {
    try {
        if (!files || files.length === 0) return { success: false, error: 'Không có file để ghép' }
        if (files.length === 1) {
            saveAs(files[0], files[0].name)
            return { success: true }
        }

        // Helper: read file to ArrayBuffer
        const readFile = (file: File): Promise<ArrayBuffer> =>
            new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target!.result as ArrayBuffer)
                reader.onerror = reject
                reader.readAsArrayBuffer(file)
            })

        // Helper: extract <w:sectPr ...>...</w:sectPr>
        const extractSectPr = (xml: string): string => {
            const idx = xml.lastIndexOf('<w:sectPr')
            if (idx === -1) return ''
            const endIdx = xml.indexOf('</w:sectPr>', idx)
            if (endIdx === -1) return ''
            return xml.substring(idx, endIdx + '</w:sectPr>'.length)
        }

        // Helper: extract body content between <w:body> and the last <w:sectPr>
        const extractBody = (xml: string): string => {
            const start = xml.indexOf('<w:body>') + '<w:body>'.length
            const end = xml.lastIndexOf('<w:sectPr') !== -1
                ? xml.lastIndexOf('<w:sectPr')
                : xml.lastIndexOf('</w:body>')
            if (start <= 0 || end <= start) return ''
            return xml.substring(start, end)
        }

        // Read all files
        const buffers = await Promise.all(files.map(readFile))

        // Parse all XMLs
        const xmlDocs = buffers.map((buf) => {
            const zip = new PizZip(buf)
            return zip.file('word/document.xml')?.asText() || ''
        })

        // Use file 1 as base - insert extra content before its <w:sectPr>
        const baseZip = new PizZip(buffers[0])
        let baseXml = baseZip.file('word/document.xml')?.asText() || ''

        const insertBeforeIdx = baseXml.lastIndexOf('<w:sectPr') !== -1
            ? baseXml.lastIndexOf('<w:sectPr')
            : baseXml.lastIndexOf('</w:body>')

        // Build content to insert from files 2..N
        // sectPr from file 1 is used as the section-break paragraph separator
        const baseSectPr = extractSectPr(xmlDocs[0])
        let insertContent = ''

        for (let i = 1; i < xmlDocs.length; i++) {
            const bodyContent = extractBody(xmlDocs[i])
            if (!bodyContent.trim()) continue

            // Use paragraph-level sectPr (from previous file) as section break separator
            // This is how Word internally handles multi-section docs — no blank pages
            const prevSectPr = extractSectPr(xmlDocs[i - 1])
            const sectionBreakPara = prevSectPr
                ? `<w:p><w:pPr>${prevSectPr}</w:pPr></w:p>`
                : `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`

            insertContent += sectionBreakPara + bodyContent
        }

        // Insert before base file's sectPr (safe, structural insert)
        baseXml =
            baseXml.substring(0, insertBeforeIdx) +
            insertContent +
            baseXml.substring(insertBeforeIdx)

        baseZip.file('word/document.xml', baseXml)

        const blob = baseZip.generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        const today = new Date()
        const dd = String(today.getDate()).padStart(2, '0')
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const yyyy = today.getFullYear()
        saveAs(blob, `ThongBao_GHEP_${files.length}file_${dd}${mm}${yyyy}.docx`)

        return { success: true }
    } catch (error: any) {
        console.error('Merge Word Error:', error)
        return { success: false, error: error.message }
    }

}


function formatDate(date: Date): string {
    const d = new Date(date)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

function truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
}

export const generateWordNotice = async (
    customers: any[],
    noticeDateStr: string,
    deadline1Ky: number,
    deadline2Ky: number
) => {
    try {
        // Cache buster to force reload of the template
        const templatePath = `/templates/thong_bao_template.docx?v=${new Date().getTime()}`
        const response = await fetch(templatePath)

        if (!response.ok) {
            throw new Error('Không tìm thấy file mẫu thong_bao_template.docx')
        }

        const content = await response.arrayBuffer()

        // --- 1. SMART SANITIZATION (TOKENIZATION STRATEGY) ---
        // Prevents recursive replacement (e.g. NAM eating KY_NAM)



        const zip = new PizZip(content)

        // VALID TAGS - SORTED BY LENGTH DESCENDING
        const VALID_TAGS = [
            'NGAY_HAN_THANG', 'TIEU_DE_THONG_BAO', 'NOI_DUNG_CANH_BAO', 'NGAY_HAN_NGAY',
            'NGAY_HAN_NAM', 'MA_LO_TRINH', 'SO_NGAY_HAN', 'NGAY_HAN', 'TONG_TIEN',
            'TONG_KY', 'DIA_CHI', 'DANH_BA', 'CODEMOI', 'KY_NAM', 'TEN_KH', 'THANG',
            'SSTT', 'NGAY', 'NAM}', 'NAM', 'DOT', 'STT', 'GB'
        ]

        // Target all XML files
        const targetFiles = Object.keys(zip.files).filter(path =>
            path === "word/document.xml" ||
            path.match(/^word\/header\d+\.xml/) ||
            path.match(/^word\/footer\d+\.xml/)
        )

        targetFiles.forEach(filePath => {
            let docXml = zip.file(filePath)?.asText()
            if (!docXml) return

            let cleanedXml = docXml

            // Store replacements to apply LATER
            // We replace Tag -> ##TOKEN_X##
            // Then after all tags are safe, we replace ##TOKEN_X## -> %%%%TAG%%%%

            // A. Replace Tags with TOKENS
            VALID_TAGS.forEach((tag, index) => {
                const searchTag = tag
                const token = `##TOKEN_${index}##` // Safe token

                // Construct Split-Tag Regex
                const chars = searchTag.split('')
                const regexStr = chars.join('(?:<[^>]+>)*')

                let searchStart = 0
                while (true) {
                    const substringToSearch = cleanedXml.substring(searchStart)
                    const splitRegex = new RegExp(regexStr, "")
                    const match = splitRegex.exec(substringToSearch)

                    if (!match) break

                    const localFoundAt = match.index
                    const matchLength = match[0].length
                    const foundAt = searchStart + localFoundAt

                    let startReplace = foundAt
                    let endReplace = foundAt + matchLength

                    // Scan braces
                    let scanLeft = foundAt
                    let bracesFound = 0
                    while (scanLeft >= Math.max(0, foundAt - 200)) {
                        if (cleanedXml[scanLeft] === '{') {
                            bracesFound++
                            if (bracesFound === 2) {
                                startReplace = scanLeft
                                break
                            }
                        }
                        scanLeft--
                    }

                    let scanRight = foundAt + matchLength
                    let bracesEndFound = 0
                    while (scanRight < Math.min(cleanedXml.length, foundAt + matchLength + 200)) {
                        if (cleanedXml[scanRight] === '}') {
                            bracesEndFound++
                            if (bracesEndFound === 2) {
                                endReplace = scanRight + 1
                                break
                            }
                        }
                        scanRight++
                    }

                    // Replace with TOKEN first
                    const before = cleanedXml.substring(0, startReplace)
                    const after = cleanedXml.substring(endReplace)

                    cleanedXml = before + token + after
                    searchStart = startReplace + token.length
                }
            })

            // B. Clean remaining braces
            cleanedXml = cleanedXml
                .replace(/\{\{/g, "")
                .replace(/\}\}/g, "")
                .replace(/\{/g, "")
                .replace(/\}/g, "")

            // C. Restore TOKENS to %%%%TAG%%%%
            VALID_TAGS.forEach((tag, index) => {
                const token = `##TOKEN_${index}##`
                const safeTag = `%%%%${tag}%%%%`
                // Global replace of token
                cleanedXml = cleanedXml.split(token).join(safeTag)
            })

            // D. MERGE LOGIC (Hardcoded Page Break)
            if (filePath === "word/document.xml") {
                const bodyStartIdx = cleanedXml.indexOf("<w:body>")

                if (bodyStartIdx !== -1) {
                    const startLoopTag = `<w:p><w:r><w:t>%%%%#c%%%%</w:t></w:r></w:p>`
                    const insertAt = bodyStartIdx + "<w:body>".length
                    cleanedXml = cleanedXml.substring(0, insertAt) + startLoopTag + cleanedXml.substring(insertAt)

                    const sectPrIdx = cleanedXml.lastIndexOf("<w:sectPr>")
                    const endBodyIdx = cleanedXml.lastIndexOf("</w:body>")

                    const cutoffIdx = (sectPrIdx !== -1) ? sectPrIdx : endBodyIdx

                    if (cutoffIdx !== -1) {
                        // Conditional Page Break Logic: Inject Raw XML variable that contains the entire Page Break Paragraph
                        // If it's the last item, the variable will be empty, so no paragraph is rendered.
                        const endLoopTag = `%%%%@pageBreakXML%%%%<w:p><w:r><w:t>%%%%/c%%%%</w:t></w:r></w:p>`
                        cleanedXml = cleanedXml.substring(0, cutoffIdx) + endLoopTag + cleanedXml.substring(cutoffIdx)
                    }
                }
            }

            zip.file(filePath, cleanedXml)
        })



        // --- 2. GENERATION ---

        const sanitizedContent = zip.generate({ type: 'arraybuffer' })
        const zp = new PizZip(sanitizedContent)

        const doc = new Docxtemplater(zp, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => "",
            delimiters: { start: '%%%%', end: '%%%%' }
        })

        const noticeDate = new Date(noticeDateStr)
        const day = noticeDate.getDate()
        const month = noticeDate.getMonth() + 1
        const year = noticeDate.getFullYear()

        // Prepare Data for Loop
        const loopData = customers.map((c, index) => {
            const tongKy = Number(c.TongKy || 0)
            const deadlineDays = tongKy === 1 ? deadline1Ky : deadline2Ky
            const deadlineDate = addDays(noticeDate, deadlineDays)

            let tieuDe = "Tạm ngưng cung cấp nước"
            let noiDung = "Nếu quá hạn, chúng tôi sẽ tạm ngưng cung cấp nước và xử lý theo các quy định hiện hành."

            if (tongKy === 1) {
                tieuDe = "Yêu cầu thanh toán tiền nước"
                noiDung = "Đề nghị Quý khách thanh toán để tránh ảnh hưởng đến việc cung cấp nước."
            }

            return {
                NAM: year,
                NGAY: day,
                THANG: month,
                'NAM}': year,

                TEN_KH: truncateText(c.TenKH, 55),
                DIA_CHI: `${c.SoNha || ''} ${c.Duong || ''}`.trim(),
                DANH_BA: c.DanhBa,
                MA_LO_TRINH: c.MLT2 || '',

                TONG_KY: tongKy,
                KY_NAM: c.KyNam,
                TONG_TIEN: typeof c.TongNo === 'number' ? c.TongNo.toLocaleString('vi-VN') : (c.TongNo || '0'),

                NGAY_HAN: formatDate(deadlineDate),
                NGAY_HAN_NGAY: deadlineDate.getDate(),
                NGAY_HAN_THANG: deadlineDate.getMonth() + 1,
                NGAY_HAN_NAM: deadlineDate.getFullYear(),
                SO_NGAY_HAN: deadlineDays,

                TIEU_DE_THONG_BAO: tieuDe,
                NOI_DUNG_CANH_BAO: noiDung,

                GB: c.GB || '',
                DOT: c.Dot || '',
                CODEMOI: c.CodeMoi || '',
                STT: index + 1,
                SSTT: index + 1,
                // Full Page Break Paragraph XML (Empty for last item)
                pageBreakXML: index < customers.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ''
            }
        })

        const context = {
            c: loopData
        }

        doc.render(context)

        const outName = `ThongBao_TongHop_${noticeDateStr}_${customers.length}KH.docx`

        const blob = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        saveAs(blob, outName)

        return { success: true, fileName: outName }

    } catch (error: any) {
        console.error("Error generating Word:", error)
        let errorMessage = error.message

        if (error.properties && error.properties.errors instanceof Array) {
            const detailedErrors = error.properties.errors
                .map((e: any) => e.properties?.explanation || e.message)
                .join('; ')
            errorMessage = `Lỗi Template: ${detailedErrors}`
        }

        return { success: false, error: errorMessage }
    }
}
