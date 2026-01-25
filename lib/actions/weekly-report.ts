'use server'

import { fetchSql } from '../soap-api'
import { getOnOffData, getDatabaseSheetData } from '../googlesheets'

// Types
export interface WeeklyReportParams {
    startDate: string // YYYY-MM-DD
    endDate: string   // YYYY-MM-DD
    selectedGroup: string
    completedNotes?: string[]
    calculationMethod: 'accumulative' | 'average'
    paymentDeadline?: string // YYYY-MM-DD
}

export interface WeeklyReportResult {
    summary: any[]
    stats: any[]
    details: any[]
    pieChartData: any
    notesSummary: any
    error?: string
}

/**
 * Main function to run Weekly Report Analysis
 * Ports logic from python: run_weekly_report_analysis
 */
export async function runWeeklyReportAnalysis(params: WeeklyReportParams): Promise<WeeklyReportResult> {
    try {
        const { startDate, endDate, selectedGroup, completedNotes = [], calculationMethod, paymentDeadline } = params

        // 1. Fetch Google Sheets Data
        const [dbData, onOffData] = await Promise.all([
            getDatabaseSheetData(),
            getOnOffData()
        ])

        if (!dbData || dbData.length === 0) {
            return { summary: [], stats: [], details: [], pieChartData: {}, notesSummary: {}, error: 'Không tìm thấy dữ liệu Danh Sách Giao' }
        }

        // 2. Filter DB Data by Date and Group
        // CRITICAL: Use Local Time construction to match user expectation (Windows machine) and parseDateSimple logic
        // new Date("YYYY-MM-DD") is UTC, which is 07:00 in VN, causing 00:00 events on start day to be filtered out.
        const [sY, sM, sD] = startDate.split('-').map(Number)
        const startObj = new Date(sY, sM - 1, sD)
        startObj.setHours(0, 0, 0, 0)

        const [eY, eM, eD] = endDate.split('-').map(Number)
        const endObj = new Date(eY, eM - 1, eD)
        endObj.setHours(23, 59, 59, 999)

        console.log(`[WEEKLY REPORT] Time Window: ${startObj.toLocaleString()} - ${endObj.toLocaleString()}`)

        let filteredDB = dbData.filter((row: any) => {
            if (!row.NgayGiao) return false
            const parts = row.NgayGiao.split('/')
            if (parts.length !== 3) return false

            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10)
            const year = parseInt(parts[2], 10)

            // Use Local Time to match startObj/endObj
            const d = new Date(year, month - 1, day)
            return d >= startObj && d <= endObj
        })

        if (selectedGroup !== 'Tất cả các nhóm') {
            filteredDB = filteredDB.filter((row: any) => row.Nhom === selectedGroup)
        }

        if (filteredDB.length === 0) {
            return { summary: [], stats: [], details: [], pieChartData: {}, notesSummary: {}, error: 'Không có dữ liệu trong khoảng thời gian và nhóm đã chọn' }
        }

        // 3. Enrich with Debt Data (HoaDon)
        const danhBaList = filteredDB.map((d: any) => d.DanhBa).filter(Boolean)
        const uniqueDanhBa = [...new Set(danhBaList)]

        // Batch fetch Debt Details
        let hoaDonMap = new Map<string, any[]>()

        if (uniqueDanhBa.length > 0) {
            const chunkSize = 200
            for (let i = 0; i < uniqueDanhBa.length; i += chunkSize) {
                const chunk = uniqueDanhBa.slice(i, i + chunkSize)
                const listStr = chunk.map((d: string) => `'${d}'`).join(',')
                const sql = `SELECT DANHBA, SOHOADON, TONGCONG, NGAYGIAI, KY, NAM FROM HoaDon WHERE DANHBA IN (${listStr})`
                const chunkData = await fetchSql('f_Select_SQL_Thutien', sql)
                if (chunkData && Array.isArray(chunkData)) {
                    chunkData.forEach((hd: any) => {
                        const db = hd.DANHBA?.trim()
                        if (!hoaDonMap.has(db)) hoaDonMap.set(db, [])
                        hoaDonMap.get(db)?.push(hd)
                    })
                }
            }
        }

        // 4. Enrich with Banking Data (BGW_HD)
        let allSoHoaDon: string[] = []
        hoaDonMap.forEach((invoices) => {
            invoices.forEach(inv => {
                if (inv.SOHOADON) allSoHoaDon.push(inv.SOHOADON.trim())
            })
        })

        let bgwMap = new Map<string, string>() // SOHOADON -> NGAYTHANHTOAN
        if (allSoHoaDon.length > 0) {
            const chunkSize = 500
            for (let i = 0; i < allSoHoaDon.length; i += chunkSize) {
                const chunk = allSoHoaDon.slice(i, i + chunkSize)
                const listStr = chunk.map(s => `'${s}'`).join(',')
                const sql = `SELECT SHDon, NgayThanhToan FROM BGW_HD WHERE SHDon IN (${listStr})`
                const chunkData = await fetchSql('f_Select_SQL_Nganhang', sql)
                if (chunkData && Array.isArray(chunkData)) {
                    chunkData.forEach((bgw: any) => {
                        const shdon = bgw.SHDon?.trim()
                        if (shdon) bgwMap.set(shdon, bgw.NgayThanhToan)
                    })
                }
            }
        }

        // 4. Process Each Row
        const processedDetails = filteredDB.map((row: any) => {
            const db = (row.DanhBa || row.ID || row.id || row.danh_ba || '').toString().trim().padStart(11, '0')

            const kyNam = row.KyNam || ''
            const invoices = hoaDonMap.get(db) || []

            // Determine "Payment Date" (Latest date)
            // Enrich invoices with BGW info
            invoices.forEach(inv => {
                const shdon = inv.SOHOADON?.trim()
                if (bgwMap.has(shdon)) {
                    inv.NGAYTHANHTOAN_BGW = bgwMap.get(shdon)
                    inv.IS_BGW = true
                }
            })

            // Filter for "Relevant" Unpaid Invoices
            const assignedPeriodsSet = new Set<string>()
            if (kyNam) {
                const parts = kyNam.split(/[\s,]+/) // Split by comma or space
                parts.forEach((part: string) => {
                    if (part.includes('/')) {
                        const ky = part.split('/')[0].padStart(2, '0')
                        const nam = part.split('/')[1]
                        if (ky && nam) {
                            assignedPeriodsSet.add(`${ky}/${nam}`)
                        }
                    }
                })
            }

            // Determine "Payment Date" (Latest date of ASSIGNED periods only)
            let maxPaymentDate: Date | null = null

            invoices.forEach(inv => {
                // Filter: Check if this invoice belongs to assigned periods
                const invKy = (inv.KY || '').toString().padStart(2, '0')
                const invNam = (inv.NAM || '').toString()
                const invKey = `${invKy}/${invNam}`

                if (assignedPeriodsSet.size > 0 && !assignedPeriodsSet.has(invKey)) {
                    return // Skip invoices not in the assigned list
                }

                if (inv.NGAYGIAI) {
                    const dateParts = inv.NGAYGIAI.split('T')[0].split('-')
                    if (dateParts.length === 3) {
                        const d = new Date(inv.NGAYGIAI)
                        if (!maxPaymentDate || d > maxPaymentDate) {
                            maxPaymentDate = d
                        }
                    }
                }

                // Also check Banking Payment Date
                if (inv.SOHOADON) {
                    const bgwDateRaw = bgwMap.get(inv.SOHOADON.trim())
                    if (bgwDateRaw) {
                        const d = new Date(bgwDateRaw)
                        if (!maxPaymentDate || d > maxPaymentDate) {
                            maxPaymentDate = d
                        }
                    }
                }
            })

            // 2. Identify Unpaid Periods
            const remainingUnpaidPeriods: string[] = []

            // Loop through ASSIGNED periods to check status
            assignedPeriodsSet.forEach(p => {
                const [ky, nam] = p.split('/')

                // Find invoice for this period
                const inv = invoices.find(i =>
                    (i.KY || '').toString().padStart(2, '0') == ky &&
                    (i.NAM || '').toString() == nam
                )

                if (!inv) {
                    // assigned period has no invoice -> Unpaid (or missing data)
                    remainingUnpaidPeriods.push(p)
                } else {
                    // Check payment status
                    let isPaid = false
                    const soHoaDon = inv.SOHOADON?.trim()

                    if (soHoaDon && bgwMap.has(soHoaDon)) {
                        isPaid = true
                    } else if (inv.TONGCONG <= 0) {
                        isPaid = true
                    } else if (inv.NGAYGIAI) {
                        isPaid = true
                    }

                    if (!isPaid) {
                        remainingUnpaidPeriods.push(p)
                    }
                }
            })

            // --- Status Logic ---
            let status = 'Chưa Thanh Toán'

            // 1. Check if customer exists in OnOff sheet
            const customerId = row.ID || row.id || ''

            // Find matching OnOff record using id_tb field
            const onOffRecord = onOffData.find((o: any) => {
                const onOffId = o.IdTB || ''
                return onOffId === customerId
            })

            // is_locked: Customer exists in OnOff sheet (ANY status)
            const isLocked = !!onOffRecord

            // is_reopened: Customer in OnOff AND TinhTrang = "Đã mở"
            const isReopened = isLocked && (onOffRecord.TinhTrang?.trim() === 'Đã mở')

            // Priority 1: Check "Khóa nước" (Locked)
            // User Request: If locked -> 'Khóa nước' (Red) regardless of reopening status
            if (isLocked) {
                status = 'Khóa nước'
            }
            // Also check DB sheet TinhTrang column for legacy "KHOÁ NƯỚC"
            else if (row.TinhTrang?.trim().toUpperCase() === 'KHOÁ NƯỚC') {
                status = 'Khóa nước'
            }

            // Variables for debug logging
            let customerLatestPeriod = ''
            let isPaidInSystem = false

            // --- PAY STATUS CALCULATION (Run for ALL rows) ---
            // Find customer's latest period from assigned periods
            if (assignedPeriodsSet.size > 0) {
                const periodsAsInt = Array.from(assignedPeriodsSet).map(p => {
                    const [ky, nam] = p.split('/')
                    return parseInt(nam) * 100 + parseInt(ky)
                })
                const maxPeriodVal = Math.max(...periodsAsInt)
                const maxNam = Math.floor(maxPeriodVal / 100)
                const maxKy = maxPeriodVal % 100
                customerLatestPeriod = `${maxKy.toString().padStart(2, '0')}/${maxNam}`
            }

            // Check if paid: no unpaid OR only unpaid is latest period
            // remainingUnpaidPeriods is already populated above (Line 238)
            const remainingUnpaidStr = remainingUnpaidPeriods.join(', ')
            isPaidInSystem = remainingUnpaidPeriods.length === 0 ||
                (remainingUnpaidPeriods.length === 1 && remainingUnpaidPeriods[0] === customerLatestPeriod)


            // --- UPDATE STATUS LOGIC ---
            // 2. Check Paid (ONLY if not already set to Khóa nước)
            if (status !== 'Khóa nước') {
                if (isPaidInSystem) {
                    status = 'Đã Thanh Toán'
                }

                // 3. Check Notes
                const noteLower = (row.GhiChu || '').toLowerCase()
                const isNoteCompleted = completedNotes.some(note => noteLower.includes(note.toLowerCase()))
                if (isNoteCompleted) {
                    status = 'Đã Thanh Toán'
                }

                // 4. Check Deadline (Late Payment -> Unpaid)
                if (status === 'Đã Thanh Toán' && maxPaymentDate) {
                    const finalMaxDate: Date = maxPaymentDate
                    let deadline: Date
                    if (calculationMethod === 'accumulative' && paymentDeadline) {
                        deadline = new Date(paymentDeadline)
                        deadline.setHours(23, 59, 59)
                    } else {
                        // Average: Deadline = NgayGiao + 9 days
                        const parts = row.NgayGiao.split('/')
                        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                        d.setDate(d.getDate() + 9)
                        d.setHours(23, 59, 59)
                        deadline = d
                    }

                    if (finalMaxDate > deadline) {
                        status = 'Chưa Thanh Toán'
                    }
                }
            }

            // Calculate Remaining Debt (Total Amount of Unpaid Periods)
            let totalDebt = 0
            const unpaidSet = new Set(remainingUnpaidPeriods) // Format: "mm/yyyy"

            if (unpaidSet.size > 0) {
                invoices.forEach(inv => {
                    const invKy = (inv.KY || '').toString().padStart(2, '0')
                    const invNam = (inv.NAM || '').toString()
                    const invKey = `${invKy}/${invNam}`

                    // Only sum if this period is Unpaid
                    if (unpaidSet.has(invKey)) {
                        totalDebt += Number(inv.TONGCONG || 0)
                    }
                })
            }

            // Determine if PaymentDate should be shown
            // Show if: Status is 'Đã Thanh Toán' OR (Status is 'Khóa nước' AND isPaidInSystem is true)
            const showPaymentDate = (status === 'Đã Thanh Toán') || (status === 'Khóa nước' && isPaidInSystem)

            return {
                ...row, // Original Data
                ComputedStatus: status,
                PaymentDate: (showPaymentDate && maxPaymentDate) ? (maxPaymentDate as any).toLocaleDateString('vi-VN') : '',
                PaymentDateRaw: maxPaymentDate, // Keep Date object for stats table
                RemainingUnpaid: remainingUnpaidPeriods.join(', '),
                IsLocked: isLocked,
                IsReopened: isReopened,
                OnOffInfo: onOffRecord,
                // CRITICAL: Export ID explicitly for Stats Joining
                StatsID: (row.ID || row.id || '').toString().trim(),
                TotalAmount: totalDebt,
                RemainingCount: remainingUnpaidPeriods.length
            }
        })

        // 6. Aggregate Summary
        const deduplicatedDetails: any[] = []
        const seenCustomers = new Map<string, Set<string>>() // key: group_date, value: Set of DanhBa

        processedDetails.forEach((row: any) => {
            const dateKey = row.NgayGiao
            const groupKey = row.Nhom
            const key = `${groupKey}_${dateKey}`
            const danhBa = row.DanhBa || row.ID

            if (!seenCustomers.has(key)) {
                seenCustomers.set(key, new Set())
            }

            // Only keep FIRST occurrence of each customer per day+group
            if (!seenCustomers.get(key)!.has(danhBa)) {
                seenCustomers.get(key)!.add(danhBa)
                deduplicatedDetails.push(row)
            }
        })

        // Now aggregate the deduplicated data
        const summaryMap = new Map<string, any>()
        const groups = selectedGroup === 'Tất cả các nhóm' ? [...new Set(deduplicatedDetails.map((r: any) => r.Nhom))].sort() : [selectedGroup]

        deduplicatedDetails.forEach((row: any) => {
            const dateKey = row.NgayGiao
            const groupKey = row.Nhom
            const key = `${groupKey}_${dateKey}`

            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    Nhom: groupKey,
                    NgayGiao: dateKey,
                    SoLuong: 0,
                    DaThanhToan: 0,
                    KhoaNuoc: 0,
                    MoNuoc: 0
                })
            }

            const entry = summaryMap.get(key)
            entry.SoLuong++

            // CRITICAL: Locked and Paid are MUTUALLY EXCLUSIVE
            // Priority: IsLocked > Paid
            if (row.IsLocked) {
                // If locked, count as locked (NOT paid, even if status is "Đã Thanh Toán")
                entry.KhoaNuoc++
            } else if (row.ComputedStatus === 'Đã Thanh Toán') {
                // Only count as paid if NOT locked
                entry.DaThanhToan++
            }

            // Reopened is separate (can overlap with locked)
            if (row.IsReopened) {
                entry.MoNuoc++
            }
        })

        const summary = Array.from(summaryMap.values()).map(s => ({
            ...s,
            PhanTram: s.SoLuong > 0 ? ((s.DaThanhToan + s.KhoaNuoc) / s.SoLuong * 100).toFixed(2) + '%' : '0%'
        })).sort((a, b) => a.NgayGiao.localeCompare(b.NgayGiao))

        // 7. Create Stats Table (Thống kê Đóng/Mở nước)
        const statsMap = new Map<string, any>()
        const parseDateSimple = (d: string): Date | null => {
            if (!d) return null
            // Handle "dd/mm/yyyy hh:mm:ss" or "dd/mm/yyyy"
            const datePart = d.split(' ')[0]
            const parts = datePart.split('/')
            if (parts.length === 3) {
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
            }
            return null
        }

        const getStatsEntry = (dateKey: string, groupKey: string) => {
            const key = `${dateKey}_${groupKey}`
            if (!statsMap.has(key)) {
                statsMap.set(key, {
                    Key: key,
                    Ngay: dateKey,
                    Nhom: groupKey,
                    KhoaTu: 0,
                    KhoaVan: 0,
                    KhoaNB: 0,
                    SoLuongMo: 0,
                    ThanhToanNgay: 0,
                    DateObj: null
                })
            }
            return statsMap.get(key)
        }

        // --- 1. Lock Stats ---
        // Step A: Collect all valid IDs from our processed list using StatsID
        const validStatsIds = new Set(
            processedDetails
                .map((r: any) => r.StatsID)
                .filter((id: string) => id && id.length > 0)
        )

        onOffData.forEach((row: any) => {
            const id = (row.IdTB || row.id_tb || '').toString().trim()
            if (!validStatsIds.has(id)) return

            if (row.NgayKhoa && typeof row.NgayKhoa === 'string' && row.NgayKhoa.trim()) {
                const dateObj = parseDateSimple(row.NgayKhoa)
                if (dateObj && dateObj >= startObj && dateObj <= endObj) {
                    const dateKey = dateObj.toLocaleDateString('en-GB')
                    const group = row.NhomKhoa || 'Chưa phân nhóm'

                    if (selectedGroup === 'Tất cả các nhóm' || group === selectedGroup) {
                        const entry = getStatsEntry(dateKey, group)
                        entry.DateObj = dateObj

                        const type = (row.KieuKhoa || '').toLowerCase()

                        // Inclusive matching for KieuKhoa types
                        if (type.includes('từ') || type.includes('tu')) {
                            entry.KhoaTu++
                        } else if (type.includes('van') || type.includes('bấm') || type.includes('chì')) {
                            entry.KhoaVan++
                        } else if (type.includes('nb') || type.includes('nút') || type.includes('bít')) {
                            entry.KhoaNB++
                        }
                    }
                }
            }
        })

        // --- 2. Open Stats ---
        onOffData.forEach((row: any) => {
            if (row.NgayMo && typeof row.NgayMo === 'string' && row.NgayMo.trim()) {
                const dateObj = parseDateSimple(row.NgayMo)
                if (dateObj && dateObj >= startObj && dateObj <= endObj) {
                    const dateKey = dateObj.toLocaleDateString('en-GB')
                    const group = row.NhomKhoa || 'Chưa phân nhóm'
                    if (selectedGroup === 'Tất cả các nhóm' || group === selectedGroup) {
                        const entry = getStatsEntry(dateKey, group)
                        entry.DateObj = dateObj
                        entry.SoLuongMo++
                    }
                }
            }
        })

        // --- 3. Payment Stats ---
        deduplicatedDetails.forEach((row: any) => {
            // Count if PaymentDate is visible (means Paid or Locked-but-Paid)
            if (row.PaymentDate && row.PaymentDateRaw) {
                const dateObj = new Date(row.PaymentDateRaw)
                // Check if valid date
                if (!isNaN(dateObj.getTime()) && dateObj >= startObj && dateObj <= endObj) {
                    const dateKey = dateObj.toLocaleDateString('en-GB')
                    const group = row.Nhom

                    const entry = getStatsEntry(dateKey, group)
                    entry.DateObj = dateObj
                    entry.ThanhToanNgay++
                }
            }
        })

        // Convert Map to Array and Sort
        const stats = Array.from(statsMap.values())
            .sort((a, b) => (a.DateObj && b.DateObj) ? a.DateObj.getTime() - b.DateObj.getTime() : 0)
            .map(s => {
                const dateParts = s.Ngay.split('/')
                if (dateParts.length === 3) {
                    const d = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]))
                    const day = d.getDay()
                    const prefix = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day]
                    s.Ngay = `${prefix} - ${s.Ngay}`
                }
                return s
            })

        // Add Total Row
        if (stats.length > 0) {
            const total = {
                Ngay: 'Tổng cộng',
                Nhom: '',
                KhoaTu: stats.reduce((sum, s) => sum + s.KhoaTu, 0),
                KhoaVan: stats.reduce((sum, s) => sum + s.KhoaVan, 0),
                KhoaNB: stats.reduce((sum, s) => sum + s.KhoaNB, 0),
                SoLuongMo: stats.reduce((sum, s) => sum + s.SoLuongMo, 0),
                ThanhToanNgay: stats.reduce((sum, s) => sum + s.ThanhToanNgay, 0)
            }
            stats.push(total)
        }

        // 8. Pie Data
        const pieChartData: any = {}
        groups.forEach(g => {
            const groupRows = processedDetails.filter((r: any) => r.Nhom === g)
            const total = groupRows.length
            if (total > 0) {
                const completed = groupRows.filter((r: any) => r.ComputedStatus === 'Đã Thanh Toán' || r.ComputedStatus === 'Khóa nước').length
                pieChartData[g] = {
                    completed,
                    total,
                    percent: (completed / total) * 100
                }
            }
        })

        return {
            summary,
            stats,
            details: processedDetails,
            pieChartData,
            notesSummary: {}
        }

    } catch (error: any) {
        console.error('[WEEKLY REPORT] Error:', error)
        return { summary: [], stats: [], details: [], pieChartData: {}, notesSummary: {}, error: error.message }
    }
}

/**
 * Build Stats Table (Thống kê Đóng/Mở)
 * Python equivalent: _report_build_stats (lines 386-485)
 * 
 * CRITICAL: Lock and unlock use DIFFERENT date columns:
 * - Lock events: Filter by NgayKhoa (Lock Date)
 * - Unlock events: Filter by NgayMo (Unlock Date)
 */
function buildStatsTable(
    onOffData: any[],
    processedDetails: any[],
    startDate: Date,
    endDate: Date,
    selectedGroup: string
): any[] {
    // Helper function to parse Vietnamese date format (dd/mm/yyyy)
    const parseViDate = (dateStr: string): Date | null => {
        if (!dateStr) return null
        try {
            // Handle both dd/mm/yyyy and yyyy-mm-dd formats
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/')
                if (parts.length === 3) {
                    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                }
            } else if (dateStr.includes('-')) {
                return new Date(dateStr)
            }
        } catch (e) {
            console.error('[buildStatsTable] Error parsing date:', dateStr, e)
        }
        return null
    }

    // Get IDs of delivered customers (CRITICAL: Only count locks for delivered customers)
    // Python: ids_da_giao = processed_df[config.DB_COL_ID].dropna().unique().tolist()
    const deliveredIds = new Set(
        processedDetails
            .map(d => d.ID || d.DanhBa)
            .filter(id => id)
    )

    // 1. Lock Events: Filter by NgayKhoa (Lock Date) AND delivered IDs
    // Python: on_off_subset_df = on_off_df[on_off_df[config.ON_OFF_COL_ID].isin(ids_da_giao)]
    const lockEvents = onOffData
        .filter(o => deliveredIds.has(o.IdTB || o.DanhBa))  // CRITICAL FIX: Only delivered customers
        .filter(o => {
            if (!o.NgayKhoa) return false
            const lockDate = parseViDate(o.NgayKhoa)
            if (!lockDate) return false
            return lockDate >= startDate && lockDate <= endDate
        })
        .filter(o => selectedGroup === 'Tất cả các nhóm' || o.NhomKhoa === selectedGroup)

    // 2. Unlock Events: Filter by NgayMo (Unlock Date)
    const unlockEvents = onOffData
        .filter(o => {
            if (!o.NgayMo) return false
            const unlockDate = parseViDate(o.NgayMo)
            if (!unlockDate) return false
            return unlockDate >= startDate && unlockDate <= endDate
        })
        .filter(o => selectedGroup === 'Tất cả các nhóm' || o.NhomKhoa === selectedGroup)

    // 3. Payment Events: Use PaymentDateRaw (Date object) instead of parsing string
    // Python: payments_df = processed_df[(processed_df['Tình Trạng Nợ'] == 'Đã Thanh Toán') & (processed_df['NGAYGIAI_DT'].notna())]
    const paymentEvents = processedDetails
        .filter(d => d.ComputedStatus === 'Đã Thanh Toán' && d.PaymentDateRaw)
        .map(d => ({
            ...d,
            ParsedDate: d.PaymentDateRaw  // Already a Date object
        }))
        .filter(d => d.ParsedDate && d.ParsedDate >= startDate && d.ParsedDate <= endDate)

    // 4. Aggregate Lock Events by Date + Group + Lock Type
    const lockMap = new Map<string, any>()
    lockEvents.forEach(event => {
        const date = parseViDate(event.NgayKhoa)
        if (!date) return

        const dateKey = date.toISOString().split('T')[0]
        const group = event.NhomKhoa || ''
        const key = `${dateKey}_${group}`

        if (!lockMap.has(key)) {
            lockMap.set(key, {
                Ngay: dateKey,
                Nhom: group,
                KhoaTu: 0,
                KhoaVan: 0,
                KhoaNB: 0
            })
        }

        const entry = lockMap.get(key)
        const lockType = event.KieuKhoa || ''

        if (lockType.includes('Khóa van từ')) entry.KhoaTu++
        else if (lockType.includes('Khóa van bấm chì') || lockType.includes('Khóa van')) entry.KhoaVan++
        else if (lockType.includes('Khóa nút bít')) entry.KhoaNB++
    })

    // 5. Aggregate Unlock Events by Date + Group
    const unlockMap = new Map<string, number>()
    unlockEvents.forEach(event => {
        const date = parseViDate(event.NgayMo)
        if (!date) return

        const dateKey = date.toISOString().split('T')[0]
        const group = event.NhomKhoa || ''
        const key = `${dateKey}_${group}`

        unlockMap.set(key, (unlockMap.get(key) || 0) + 1)
    })

    // 6. Aggregate Payment Events by Date + Group
    const paymentMap = new Map<string, Set<string>>()
    paymentEvents.forEach((event: any) => {
        if (!event || !event.ParsedDate) return

        const dateKey = event.ParsedDate.toISOString().split('T')[0]
        const group = event.Nhom || ''
        const key = `${dateKey}_${group}`

        if (!paymentMap.has(key)) {
            paymentMap.set(key, new Set())
        }
        paymentMap.get(key)!.add(event.DanhBa)
    })

    // 7. Merge all data
    const allKeys = new Set([
        ...lockMap.keys(),
        ...unlockMap.keys(),
        ...paymentMap.keys()
    ])

    const statsData = Array.from(allKeys).map(key => {
        const lockData = lockMap.get(key) || { Ngay: key.split('_')[0], Nhom: key.split('_')[1], KhoaTu: 0, KhoaVan: 0, KhoaNB: 0 }
        const unlockCount = unlockMap.get(key) || 0
        const paymentCount = paymentMap.get(key)?.size || 0

        return {
            Ngay: lockData.Ngay,
            Nhom: lockData.Nhom,
            KhoaTu: lockData.KhoaTu,
            KhoaVan: lockData.KhoaVan,
            KhoaNB: lockData.KhoaNB,
            SoLuongMo: unlockCount,
            ThanhToanNgay: paymentCount
        }
    })

    // 8. Sort by date
    statsData.sort((a, b) => a.Ngay.localeCompare(b.Ngay))

    // 9. Add totals row
    const totals = {
        Ngay: 'Tổng cộng',
        Nhom: '',
        KhoaTu: statsData.reduce((sum, row) => sum + row.KhoaTu, 0),
        KhoaVan: statsData.reduce((sum, row) => sum + row.KhoaVan, 0),
        KhoaNB: statsData.reduce((sum, row) => sum + row.KhoaNB, 0),
        SoLuongMo: statsData.reduce((sum, row) => sum + row.SoLuongMo, 0),
        ThanhToanNgay: statsData.reduce((sum, row) => sum + row.ThanhToanNgay, 0)
    }

    statsData.push(totals)

    // 10. Format dates to Vietnamese format with weekday
    const vietnameseWeekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    return statsData.map(row => {
        if (row.Ngay === 'Tổng cộng') return row

        const date = new Date(row.Ngay)
        const weekday = vietnameseWeekdays[date.getDay()]
        const formatted = `${weekday} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`

        return {
            ...row,
            Ngay: formatted
        }
    })
}
