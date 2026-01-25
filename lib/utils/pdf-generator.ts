import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: { finalY: number };
    }
}

// Font loading helper
const loadFonts = async (doc: jsPDF) => {
    // We need to load fonts from public/fonts
    // Since we are client-side, we can fetch them
    const fontFiles = [
        { name: 'TimesNewRoman', style: 'normal', path: '/fonts/times.ttf' },
        { name: 'TimesNewRoman', style: 'bold', path: '/fonts/timesbd.ttf' },
        { name: 'TimesNewRoman', style: 'italic', path: '/fonts/timesi.ttf' },
        { name: 'TimesNewRoman', style: 'bolditalic', path: '/fonts/timesbi.ttf' },
    ]

    for (const font of fontFiles) {
        try {
            const response = await fetch(font.path)
            const arrayBuffer = await response.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            doc.addFileToVFS(font.path, base64)
            doc.addFont(font.path, font.name, font.style)
        } catch (error) {
            console.error(`Error loading font ${font.path}:`, error)
        }
    }
}

// Generate Header
const addHeader = (doc: jsPDF, isLandscape = false) => {
    const pageWidth = doc.internal.pageSize.width

    doc.setFont('TimesNewRoman', 'normal')
    doc.setFontSize(11)

    // Left Header
    doc.text('CÔNG TY CỔ PHẦN CẤP NƯỚC BẾN THÀNH', pageWidth * 0.25, 15, { align: 'center' })
    doc.setFont('TimesNewRoman', 'bold')
    doc.text('ĐỘI QUẢN LÝ GHI THU NƯỚC', pageWidth * 0.25, 20, { align: 'center' })
    doc.line(pageWidth * 0.15, 22, pageWidth * 0.35, 22) // Line under Left Header

    // Right Header
    doc.setFont('TimesNewRoman', 'bold')
    doc.text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', pageWidth * 0.75, 15, { align: 'center' })
    doc.text('Độc lập - Tự do - Hạnh phúc', pageWidth * 0.75, 20, { align: 'center' })
    doc.line(pageWidth * 0.65, 22, pageWidth * 0.85, 22) // Line under Right Header
}

// Generate Footer / Date
const addDateFooter = (doc: jsPDF, isLandscape = false) => {
    const pageWidth = doc.internal.pageSize.width
    const today = new Date()
    const dateStr = `Thành phố Hồ Chí Minh, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`

    doc.setFont('TimesNewRoman', 'italic')
    doc.setFontSize(11)
    doc.text(dateStr, pageWidth * 0.95, 30, { align: 'right' })
}

export const generateWeeklyReportPDF = async (data: any, params: any) => {
    const doc = new jsPDF()
    await loadFonts(doc)

    const { summary, stats, pieChartData } = data
    const { startDate, endDate, selectedGroup } = params

    // === HEADER ===
    addHeader(doc)
    addDateFooter(doc)

    // Title Block
    doc.setFont('TimesNewRoman', 'bold')
    doc.setFontSize(16)
    doc.text('BÁO CÁO CÔNG TÁC TUẦN', 105, 45, { align: 'center' })

    const dateDisplay = startDate === endDate
        ? `Ngày giao : ${startDate.split('-').reverse().join('/')}`
        : `Thời gian giao: ${startDate.split('-').reverse().join('/')} đến ${endDate.split('-').reverse().join('/')}`

    doc.setFont('TimesNewRoman', 'normal')
    doc.setFontSize(13)
    doc.text(dateDisplay, 105, 52, { align: 'center' })

    const staffMap: Record<string, string[]> = {
        'Sang Sơn': ['Nguyễn Minh Sang', 'Đặng Ngọc Sơn'],
        'Thi Náo': ['Thi', 'Náo']
    }
    const staff = staffMap[selectedGroup] ? staffMap[selectedGroup].join(', ') : 'Tổng hợp'
    doc.text(`Nhân viên : ${staff}`, 105, 59, { align: 'center' })

    let finalY = 65

    // === TABLE 1: SUMMARY ===
    doc.setFont('TimesNewRoman', 'bold')
    doc.setFontSize(14)
    doc.text('BẢNG TỔNG HỢP:', 14, finalY + 10)

    const summaryHeaders = [['Tổ/Nhóm', 'Ngày Giao', 'Số Lượng', 'Đã Thanh Toán', 'Khóa Nước', 'Tỷ lệ']]
    const summaryBody = summary.map((row: any) => [
        row.Nhom,
        row.NgayGiao,
        row.SoLuong,
        row.DaThanhToan,
        row.KhoaNuoc,
        row.PhanTram
    ])

    // Add Total Row for Summary
    // Calculate totals manually if not present
    const totalQty = summary.reduce((sum: number, r: any) => sum + r.SoLuong, 0)
    const totalPaid = summary.reduce((sum: number, r: any) => sum + r.DaThanhToan, 0)
    const totalLocked = summary.reduce((sum: number, r: any) => sum + r.KhoaNuoc, 0)
    const totalPercent = totalQty > 0 ? ((totalPaid + totalLocked) / totalQty * 100).toFixed(2) + '%' : '0%'

    summaryBody.push(['Tổng cộng', '', totalQty, totalPaid, totalLocked, totalPercent])

    autoTable(doc, {
        startY: finalY + 15,
        head: summaryHeaders,
        body: summaryBody,
        theme: 'grid',
        styles: { font: 'TimesNewRoman', fontSize: 11, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [224, 224, 224], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 35, halign: 'left' },
            1: { cellWidth: 35, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 35, halign: 'center' },
            4: { cellWidth: 30, halign: 'center' },
            5: { cellWidth: 25, halign: 'center' },
        },
        willDrawCell: (data: any) => {
            if (data.row.raw[0] === 'Tổng cộng') {
                doc.setFont('TimesNewRoman', 'bold')
            }
        },
        didParseCell: (data: any) => {
            if (data.row.raw[0] === 'Tổng cộng') {
                data.cell.styles.fontStyle = 'bold'
            }
        }
    })

    finalY = (doc as any).lastAutoTable.finalY + 15

    // === TABLE 2: STATS ===
    doc.setFont('TimesNewRoman', 'bold')
    doc.setFontSize(14)
    doc.text('BẢNG THỐNG KÊ CHI TIẾT:', 14, finalY)

    const statsHeaders = [['Ngày', 'Khóa từ', 'Khóa van', 'Khóa NB', 'Số Lượng Mở', 'Thanh toán ngày']]
    const statsBody = stats.map((row: any) => [
        row.Ngay.replace(/^\w+\s-\s/, ''), // Remove Weekday prefix for PDF to save space or keep it? format is "T2 - 19/01/2026". Let's keep it.
        row.KhoaTu,
        row.KhoaVan,
        row.KhoaNB,
        row.SoLuongMo,
        row.ThanhToanNgay
    ])

    autoTable(doc, {
        startY: finalY + 5,
        head: statsHeaders,
        body: statsBody,
        theme: 'grid',
        styles: { font: 'TimesNewRoman', fontSize: 11, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
        headStyles: { fillColor: [224, 224, 224], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 40, halign: 'left' }, // Date
            // Auto width for others
        },
        didParseCell: (data: any) => {
            if (data.row.raw[0] === 'Tổng cộng') {
                data.cell.styles.fontStyle = 'bold'
            }
        }
    })

    // === SIGNATURES ===
    finalY = (doc as any).lastAutoTable.finalY + 20

    // Check page break
    if (finalY > 250) {
        doc.addPage()
        finalY = 20
    }

    if (staffMap[selectedGroup]) {
        const staffList = staffMap[selectedGroup]
        doc.setFont('TimesNewRoman', 'bold')
        doc.text('NHÂN VIÊN', 50, finalY, { align: 'center' })
        doc.text('NHÂN VIÊN', 160, finalY, { align: 'center' })

        doc.setFont('TimesNewRoman', 'italic')
        doc.text(staffList[0], 50, finalY + 30, { align: 'center' })
        doc.text(staffList[1], 160, finalY + 30, { align: 'center' })
    }

    doc.save(`Bao_Cao_Tuan_${selectedGroup}_${startDate}.pdf`)
}

export const generateDetailedListPDF = async (data: any[], title: string) => {
    // Landscape A4
    const doc = new jsPDF({ orientation: 'landscape' })
    await loadFonts(doc)

    // === HEADER ===
    addHeader(doc, true)
    addDateFooter(doc, true)

    // Title
    doc.setFont('TimesNewRoman', 'bold')
    doc.setFontSize(14)
    doc.text(title.toUpperCase(), 148, 45, { align: 'center' })

    // Table
    // Updated Columns based on feedback: 
    // - Remove 'TIÊU THỤ'
    // - Fix 'ĐỊA CHỈ' (Combine SoNha + Duong if available, or finding correct field)
    // - Fix 'TỔNG CỘNG' (Total Amount)
    // - NEW: Remove 'NGÀY TT', Add 'TỔNG KỲ'
    // - LATEST: Remove 'TÌNH TRẠNG', Add 'HỘP', Move 'GB' & 'ĐỢT' after 'KỲ'
    const headers = [['STT', 'DANH BỘ', 'KHÁCH HÀNG', 'ĐỊA CHỈ', 'TỔNG KỲ', 'TỔNG CỘNG', 'KỲ', 'GB', 'ĐỢT', 'HỘP', 'GHI CHÚ']]

    const body = data.map((row: any, index: number) => {
        // Fix Address
        const address = row.DiaChi || `${row.SoNha || ''} ${row.Duong || ''}`.trim() || ''

        // Fix Total Amount
        const totalAmount = row.TotalAmount ? new Intl.NumberFormat('vi-VN').format(row.TotalAmount) : '0'

        // Calculate Total Periods (Tong Ky) - Reflects Remaining Debt Periods
        // Use RemainingCount from API if available
        let displayTongKy = 0
        if (row.RemainingCount !== undefined) {
            displayTongKy = row.RemainingCount
        } else if (row.KyNam) {
            // Fallback
            displayTongKy = row.KyNam.split(',').filter((p: string) => p.trim().length > 0).length
        }

        return [
            index + 1,
            row.DanhBa,
            row.TenKH,
            address,
            displayTongKy,
            totalAmount,
            row.KyNam,
            row.GB,
            row.Dot,
            row.HopBaoVe || '',
            row.GhiChu || ''
        ]
    })

    autoTable(doc, {
        startY: 55,
        head: headers,
        body: body,
        theme: 'grid',
        styles: { font: 'TimesNewRoman', fontSize: 10, lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1, valign: 'middle', halign: 'center' },
        headStyles: { fillColor: [224, 224, 224], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 10 }, // STT
            1: { cellWidth: 25 }, // Danh Bo
            2: { cellWidth: 40 }, // Ten KH
            3: { cellWidth: 55 }, // Dia Chi
            4: { cellWidth: 12 }, // Tong Ky
            5: { cellWidth: 25 }, // Tong Cong
            6: { cellWidth: 30 }, // Ky
            7: { cellWidth: 10 }, // GB
            8: { cellWidth: 10 }, // Dot
            9: { cellWidth: 10 }, // Hop
            10: { cellWidth: 'auto' } // Ghi Chu
        },
    })

    doc.save(`Chi_Tiet_${title.replace(/\s+/g, '_')}.pdf`)
}
