import { getAssignedCustomers, getWaterLockStatus, AssignedCustomer, WaterLockStatus } from '../google-sheets'
import { executeSqlQuery } from '../soap'
import { parse, isAfter, isBefore, format, parseISO } from 'date-fns'

// Types
export interface PaymentReportParams {
    startDate: string // YYYY-MM-DD
    endDate: string   // YYYY-MM-DD
    group?: string
}

export interface CustomerPaymentStatus extends AssignedCustomer {
    STATUS: 'Đã Thanh Toán' | 'Chưa Thanh Toán' | 'Khóa Nước'
    DETAILS_UNPAID: string // Comma separated periods e.g. "01/2024,02/2024"
    IS_LOCKED: boolean
    LATEST_LOCK_DATE?: string
    LATEST_UNLOCK_DATE?: string
}

export interface PaymentReportSummary {
    total: number
    paid: number
    locked: number
    completionRate: number
    revenue: number
    dailyStats: DailyStat[]
    customerDetails: CustomerPaymentStatus[]
}

export interface DailyStat {
    date: string
    total: number
    paid: number
    locked: number
    unlocked: number // Số lượng mở
}

// Interfaces for SOAP Results
interface BillRecord {
    DANHBA: string
    SOHOADON: string
    KY: string
    NAM: string
    TONGCONG: number
    NGAYGIAI: string // Can be null
}

interface BGWPayment {
    SOHOADON: string
    NgayThanhToan_BGW: string
}

/**
 * Main Function: Generate Payment Analysis Report
 */
export async function getPaymentAnalysis(params: PaymentReportParams): Promise<PaymentReportSummary> {
    const { startDate, endDate, group } = params

    // 1. Fetch Assigned Customers from Google Sheet
    const allAssigned = await getAssignedCustomers()

    // 2. Filter by Date and Group
    const filteredAssigned = allAssigned.filter(c => {
        try {
            // Parse NGAY_GIAO (usually dd-mm-yy or dd/mm/yyyy or yyyy-mm-dd)
            // We accept standard formatting. Assuming 'dd/MM/yyyy' from Sheet based on old app.
            // normalizeDate helps to parse correctly.
            const assignedDate = parseDateString(c.NGAY_GIAO)
            if (!assignedDate) return false

            const start = parseISO(startDate)
            const end = parseISO(endDate)
            // Set end date to end of day
            end.setHours(23, 59, 59, 999)

            const isDateInRange = isAfter(assignedDate, start) && isBefore(assignedDate, end) ||
                assignedDate.getTime() === start.getTime() ||
                assignedDate.getTime() === end.getTime()

            const isGroupMatch = group && group !== 'Tất cả các nhóm' ? c.NHOM === group : true

            return isDateInRange && isGroupMatch
        } catch (e) {
            return false
        }
    })

    // 3. Fetch Water Lock Status
    const allLockStatus = await getWaterLockStatus()

    // 4. Determine Payment Status for each customer
    const customerDetails = await determineCustomerStatus(filteredAssigned, allLockStatus)

    // 5. Build Summary Statistics
    const summary = calculateSummary(customerDetails, allLockStatus, startDate, endDate)

    return summary
}

/**
 * Core Logic: Determine Status (Parallel to _report_process_final_data)
 */
async function determineCustomerStatus(
    customers: AssignedCustomer[],
    lockStatus: WaterLockStatus[]
): Promise<CustomerPaymentStatus[]> {

    // Get all unique Danh Ba to optimize queries
    const uniqueDanhBa = Array.from(new Set(customers.map(c => c.DANH_BO)))

    // Fetch Unpaid Bills from SOAP API for these customers
    // We fetch ALL unpaid bills first
    const unpaidBillsMap = await fetchUnpaidBills(uniqueDanhBa)

    return customers.map(customer => {
        const danhBo = customer.DANH_BO

        // Get assigned periods (from 'KY_NAM' column, e.g. "01/2024, 02/2024")
        const assignedPeriods = customer.KY_NAM.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)

        // Get unpaid periods from System
        const unpaidPeriodsSystem = unpaidBillsMap.get(danhBo) || []

        // Intersection: Relevant Unpaid Periods
        // Logic: Only care about periods that were ASSIGNED to be collected
        const detailsUnpaid = assignedPeriods.filter(p => unpaidPeriodsSystem.includes(p))

        // Check Lock Status
        // We check if this ID (customer.ID) exists in lockStatus with "id" matching
        // Note: old app joins on ID. Let's assume ID is reliable.
        const lockRecord = lockStatus.find(l => l.ID === customer.ID)
        const isLocked = !!lockRecord

        let status: CustomerPaymentStatus['STATUS'] = 'Chưa Thanh Toán'

        if (detailsUnpaid.length === 0) {
            status = 'Đã Thanh Toán'
        } else if (isLocked) {
            // In old app, if it is locked, it counts as 'Khoá nước' (which is good)
            // But we might need more complex logic if "locked but has debt".
            // Old app logic:
            // choices = ['Khóa nước', 'Đã Thanh Toán', 'Đã Thanh Toán']
            // conditions = [is_locked_status, paid_in_system, note_condition]
            // Priority: Locked > Paid > Note. 
            // Wait, if Locked, it is 'Khóa nước'. 
            status = 'Khóa Nước'
        }

        return {
            ...customer,
            STATUS: status,
            DETAILS_UNPAID: detailsUnpaid.join(', '),
            IS_LOCKED: isLocked,
            LATEST_LOCK_DATE: lockRecord?.NGAY_KHOA,
            LATEST_UNLOCK_DATE: lockRecord?.NGAY_MO
        }
    })
}

/**
 * Fetch Unpaid Bills Logic
 * Combines logic from fetch_unpaid_debt_details and SOAP
 */
async function fetchUnpaidBills(danhBaList: string[]): Promise<Map<string, string[]>> {
    if (danhBaList.length === 0) return new Map()

    // 1. Get Bills with Null NGAYGIAI
    // Since passing thousands of IDs to SOAP might crash it, we might query ALL unpaid
    // OR chunk it. Old app fetches ALL unpaid (no WHERE DANHBA IN...).
    // Query: SELECT DANHBA, KY, NAM, SOHOADON FROM HoaDon WHERE NGAYGIAI IS NULL

    const sql = `SELECT DANHBA, KY, NAM, SOHOADON FROM HoaDon WHERE NGAYGIAI IS NULL`
    const rawBills = await executeSqlQuery('f_Select_SQL_Thutien', sql) as any[]

    // Normalize result
    let bills: BillRecord[] = rawBills.map((b: any) => ({
        DANHBA: b.DANHBA?.toString()?.trim(),
        SOHOADON: b.SOHOADON?.toString()?.trim(),
        KY: b.KY?.toString()?.trim(),
        NAM: b.NAM?.toString()?.trim(),
        TONGCONG: 0, // Not needed for this check
        NGAYGIAI: ''
    }))

    // Filter for requested customers locally to save memory if list is huge? 
    // Actually, we should filter FIRST.
    bills = bills.filter(b => danhBaList.includes(b.DANHBA))

    if (bills.length === 0) return new Map()

    // 2. Check BGW (Bank Payments)
    // Some bills might be paid via Bank but NGAYGIAI is NULL in main table
    const soHoaDonList = bills.map(b => b.SOHOADON)
    const paidViaBank = await checkBGWPayments(soHoaDonList)

    // 3. Filter out bills paid via Bank
    const trulyUnpaidBills = bills.filter(b => !paidViaBank.has(b.SOHOADON))

    // 4. Group by DANHBA -> Array of "MM/YYYY"
    const result = new Map<string, string[]>()

    trulyUnpaidBills.forEach(b => {
        const key = b.DANHBA
        const period = `${b.KY.padStart(2, '0')}/${b.NAM}`

        const existing = result.get(key) || []
        if (!existing.includes(period)) {
            existing.push(period)
        }
        result.set(key, existing)
    })

    return result
}

/**
 * Check Bank Gateway Payments
 */
async function checkBGWPayments(soHoaDonList: string[]): Promise<Set<string>> {
    if (soHoaDonList.length === 0) return new Set()

    // Chunking loop to avoid query limit
    const chunkSize = 500
    const paidSet = new Set<string>()

    for (let i = 0; i < soHoaDonList.length; i += chunkSize) {
        const chunk = soHoaDonList.slice(i, i + chunkSize)
        const listStr = chunk.map(s => `'${s}'`).join(',')
        const sql = `SELECT SOHOADON_BGW FROM BGW_HD WHERE SOHOADON_BGW IN (${listStr})`

        const res = await executeSqlQuery('f_Select_SQL_Nganhang', sql) as any[]
        res.forEach((r: any) => {
            if (r.SOHOADON_BGW) paidSet.add(r.SOHOADON_BGW.toString().trim())
        })
    }

    return paidSet
}

/**
 * Calculate Summary Stats
 */
function calculateSummary(
    details: CustomerPaymentStatus[],
    allLockStatus: WaterLockStatus[],
    startDateStr: string,
    endDateStr: string
): PaymentReportSummary {

    const total = details.length
    const paid = details.filter(d => d.STATUS === 'Đã Thanh Toán').length
    const locked = details.filter(d => d.STATUS === 'Khóa Nước').length

    // Group by Date for Chart
    const dailyMap = new Map<string, DailyStat>()

    // Helper to init day
    const getOrCreateDay = (dateStr: string) => {
        // Normalize date format to YYYY-MM-DD for map key
        if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, {
                date: dateStr,
                total: 0,
                paid: 0,
                locked: 0,
                unlocked: 0
            })
        }
        return dailyMap.get(dateStr)!
    }

    // Iterate details to fill stats
    details.forEach(d => {
        // We group by NGAY_GIAO
        // Need to parse d.NGAY_GIAO
        const dateObj = parseDateString(d.NGAY_GIAO)
        if (dateObj) {
            const dateKey = format(dateObj, 'yyyy-MM-dd')
            const stat = getOrCreateDay(dateKey)

            stat.total++
            if (d.STATUS === 'Đã Thanh Toán') stat.paid++
            if (d.STATUS === 'Khóa Nước') stat.locked++
        }
    })

    // Calculate "Unlocked" (So Luong Mo)
    // Logic from python: Count 'NGAY_MO' in range.
    // Note: 'details' only contains "ASSIGNED" customers. 
    // Should "Unlocked" count strictly from assigned list, or global list?
    // Old app: `mo_df_filtered = mo_df[(mo_df['Ngày'] >= start_date) & (mo_df['Ngày'] <= end_date)]`
    // And it joins. So it seems independent of assignment list in the Summary text, but maybe mapped in chart.
    // Let's count from allLockStatus where NGAY_MO is in range.

    allLockStatus.forEach(l => {
        const unlockDate = parseDateString(l.NGAY_MO)
        const start = parseISO(startDateStr)
        const end = parseISO(endDateStr)
        end.setHours(23, 59, 59)

        if (unlockDate && isAfter(unlockDate, start) && isBefore(unlockDate, end)) {
            const dateKey = format(unlockDate, 'yyyy-MM-dd')
            // We only add to daily stats if that day exists in assignment?
            // Or creating new entry? Old app merges tables.
            const stat = getOrCreateDay(dateKey)
            stat.unlocked++
        }
    })

    // Convert map to array and sort
    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    return {
        total,
        paid,
        locked,
        completionRate: total > 0 ? ((paid + locked) / total) * 100 : 0,
        revenue: 0, // Placeholder, sum TONG_TIEN later
        dailyStats,
        customerDetails: details
    }
}

// Utility: Flexible Date Parser
function parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null
    dateStr = dateStr.trim()

    // Try formats
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'd/M/yyyy']

    for (const fmt of formats) {
        try {
            const d = parse(dateStr, fmt, new Date())
            if (!isNaN(d.getTime())) return d
        } catch (e) {
            continue
        }
    }
    return null
}
