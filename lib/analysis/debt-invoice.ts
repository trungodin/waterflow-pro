import { executeSqlQuery } from '../soap'

export interface DebtAnalysisFilter {
    // Optional filters if we want to restrict analysis range, 
    // although typically "Debt Analysis" looks at ALL outstanding debt (or up to a point).
    // Let's copy structure but maybe defaults are "up to now".
    toKy: number
    toNam: number
    minDebt: number
    dotFilter?: number[]
    gbFilter?: {
        operator: string
        value?: number
        values?: number[]
    }
}

export interface DebtByYear {
    nam: number
    soLuongHD: number
    tongNo: number
}

export interface DebtByPeriodCount {
    soKyNo: number
    soLuongKH: number
    tongNo: number
    danhSachKH: string[] // List of DANHBA for drill-down/reference
}

export interface DebtAnalysisResult {
    summary: {
        totalDebt: number
        totalInvoices: number
        totalCustomers: number
    }
    byYear: DebtByYear[]
    byPeriodCount: DebtByPeriodCount[]
}

export async function getDebtAnalysis(filters: DebtAnalysisFilter): Promise<DebtAnalysisResult> {
    // 1. Construct SQL Query
    // We want all invoices where NGAYGIAI IS NULL (Unpaid)
    // Up to the specified period

    const { toKy, toNam, minDebt, dotFilter, gbFilter } = filters
    const endPeriod = toNam * 100 + toKy

    let dotCondition = ''
    if (dotFilter && dotFilter.length > 0) {
        dotCondition = ` AND DOT IN (${dotFilter.join(',')})`
    }

    let gbCondition = ''
    if (gbFilter) {
        const { operator, value, values } = gbFilter
        if (['IN', 'NOT IN', '<>'].includes(operator) && values && values.length > 0) {
            gbCondition = ` AND GB ${operator} (${values.join(',')})`
        } else if (value !== undefined) {
            gbCondition = ` AND GB ${operator} ${value}`
        }
    }

    // Query: Get all unpaid invoices <= endPeriod
    const query = `
        SELECT DANHBA, NAM, TONGCONG
        FROM HoaDon
        WHERE (NAM * 100 + KY) <= ${endPeriod}
          AND (NGAYGIAI IS NULL)
          ${dotCondition}
          ${gbCondition}
    `

    console.log('Executing Debt Analysis Query...')
    const rawData = await executeSqlQuery('f_Select_SQL_Thutien', query) as any[]

    if (!rawData || rawData.length === 0) {
        return {
            summary: { totalDebt: 0, totalInvoices: 0, totalCustomers: 0 },
            byYear: [],
            byPeriodCount: []
        }
    }

    // 2. Process Data
    const byYearMap = new Map<number, DebtByYear>()
    const customerDebtsMap = new Map<string, { count: number, debt: number }>()

    let totalDebt = 0
    let totalInvoices = 0

    rawData.forEach((row: any) => {
        const nam = parseInt(row.NAM)
        const debt = parseFloat(row.TONGCONG || '0')
        const danhBa = row.DANHBA?.toString()

        if (isNaN(debt) || debt < 0) return

        // Global stats
        totalDebt += debt
        totalInvoices++

        // By Year
        if (!byYearMap.has(nam)) {
            byYearMap.set(nam, { nam, soLuongHD: 0, tongNo: 0 })
        }
        const yearStat = byYearMap.get(nam)!
        yearStat.soLuongHD++
        yearStat.tongNo += debt

        // By Customer (for Period Count)
        if (danhBa) {
            if (!customerDebtsMap.has(danhBa)) {
                customerDebtsMap.set(danhBa, { count: 0, debt: 0 })
            }
            const cust = customerDebtsMap.get(danhBa)!
            cust.count++
            cust.debt += debt
        }
    })

    // Filter by Min Debt (Applies to TOTAL debt of customer?)
    // Usually "Min Debt" filter applies to the *Customer's total debt* or *Invoice amount*?
    // In LatenessAnalysis, the SQL `TONGCONG >= minDebt` filters individual invoices?
    // Let's assume user wants to visualize ALL unpaid debt, but maybe filter out small invoices?
    // Wait, in LatenessAnalysis we filtered `WHERE TONGCONG >= minDebt`. 
    // If the requirement is "Total outstanding debt >= minDebt", we should filter AFTER grouping.
    // However, recreating exact logic: if `minDebt` was passed, usually it means "Only count customers with Total Debt >= X".
    // Let's implement post-processing filter for consistency with typical "Debt Analysis".

    // 3. Compile Results

    // A. By Year
    const byYear: DebtByYear[] = Array.from(byYearMap.values()).sort((a, b) => a.nam - b.nam)

    // B. By Period Count
    const byPeriodCountMap = new Map<number, DebtByPeriodCount>()

    // Also re-calculate totalCustomers based on minDebt filter
    const validCustomers: string[] = []

    customerDebtsMap.forEach((val, key) => {
        if (val.debt >= minDebt) {
            validCustomers.push(key)

            // Add to period count stats
            const periodCount = val.count
            if (!byPeriodCountMap.has(periodCount)) {
                byPeriodCountMap.set(periodCount, {
                    soKyNo: periodCount,
                    soLuongKH: 0,
                    tongNo: 0,
                    danhSachKH: []
                })
            }
            const stat = byPeriodCountMap.get(periodCount)!
            stat.soLuongKH++
            stat.tongNo += val.debt
            stat.danhSachKH.push(key)
        }
    })

    const byPeriodCount: DebtByPeriodCount[] = Array.from(byPeriodCountMap.values())
        .sort((a, b) => a.soKyNo - b.soKyNo)

    // Re-sum totals based on valid customers (if minDebt filtered anything out)
    // Actually, `byYear` might contain debts from customers < minDebt. 
    // Should we filter `byYear` data too?
    // If "Min Debt" is a filter on the *analysis* scope, everything should be consistent.
    // Let's re-calculate `byYear` and globals if `minDebt` > 0.

    if (minDebt > 0) {
        // Reset and re-aggregate
        totalDebt = 0
        totalInvoices = 0
        byYearMap.clear()

        // We need to know which invoices belong to valid customers.
        // But we didn't store invoice-level detail mapped to customer in a way to re-loop easily without re-processing rawData.
        // Optimization: Create a Set of valid DBs first.
    }

    const validDbSet = new Set(validCustomers)

    // Final Aggregation pass (ensuring consistency)
    const finalByYearMap = new Map<number, DebtByYear>()
    let finalTotalDebt = 0
    let finalTotalInvoices = 0

    rawData.forEach((row: any) => {
        const danhBa = row.DANHBA?.toString()
        const debt = parseFloat(row.TONGCONG || '0')
        const nam = parseInt(row.NAM)

        // Only count if customer is in valid set (satisfies minDebt)
        if (danhBa && validDbSet.has(danhBa)) {
            finalTotalDebt += debt
            finalTotalInvoices++

            if (!finalByYearMap.has(nam)) {
                finalByYearMap.set(nam, { nam, soLuongHD: 0, tongNo: 0 })
            }
            const s = finalByYearMap.get(nam)!
            s.soLuongHD++
            s.tongNo += debt
        }
    })

    const finalByYear = Array.from(finalByYearMap.values()).sort((a, b) => a.nam - b.nam)

    return {
        summary: {
            totalDebt: finalTotalDebt,
            totalInvoices: finalTotalInvoices,
            totalCustomers: validCustomers.length
        },
        byYear: finalByYear,
        byPeriodCount
    }
}


