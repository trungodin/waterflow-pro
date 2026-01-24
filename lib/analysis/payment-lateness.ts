import { executeSqlQuery } from '../soap'

export interface LatenessFilter {
    fromKy: number
    fromNam: number
    toKy: number
    toNam: number
    minDebt: number
    dotFilter?: number[] // List of DOTs
    gbFilter?: {
        operator: string
        value?: number
        values?: number[]
    }
}

export interface CustomerLatenessStatus {
    DANHBA: string
    TENKH: string
    DIACHI: string
    SO: string
    DUONG: string
    DOT: string
    TONGCONG_BD: number
    MLT: string
    ON_TIME_RATE: number
    CLASSIFICATION: string
    PAYMENT_STATUS_BY_PERIOD: Record<string, string> // Key: "MM/YYYY", Value: "Date" or "Status"
}

export interface LatenessAnalysisResult {
    summary: {
        totalCustomers: number
        totalDebt: number
        avgRate: number
        maxRate: number
        minRate: number
        excellentCount: number
        classificationCounts: Record<string, number>
    }
    details: CustomerLatenessStatus[]
}

/**
 * Main Analysis Function
 */
export async function getLatenessAnalysis(filters: LatenessFilter): Promise<LatenessAnalysisResult> {
    const { fromKy, fromNam, toKy, toNam, minDebt, dotFilter, gbFilter } = filters
    const startPeriod = fromNam * 100 + fromKy
    const endPeriod = toNam * 100 + toKy

    // 1. Construct SQL Query
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

    // CTE Query adapted from old app
    // Note: We select essential columns. Using ROW_NUMBER to get latest customer info.
    const query = `
    WITH RelevantDanhBa AS (
        SELECT DISTINCT DANHBA 
        FROM HoaDon
        WHERE (NAM * 100 + KY) BETWEEN ${startPeriod} AND ${endPeriod}
          AND TONGCONG >= ${minDebt}
          ${dotCondition}
          ${gbCondition}
    ),
    LatestPeriodData AS (
        SELECT 
            DANHBA, NAM, KY, TONGCONG_BD, MLT,
            ROW_NUMBER() OVER (PARTITION BY DANHBA ORDER BY NAM DESC, KY DESC) as rn
        FROM HoaDon
        WHERE DANHBA IN (SELECT DANHBA FROM RelevantDanhBa)
    )
    SELECT 
        T1.DANHBA, T1.NAM, T1.KY, T1.NGAYGIAI, T1.TONGCONG, 
        T1.SO, T1.DUONG, T1.TENKH, T1.DOT,
        LPD.TONGCONG_BD, LPD.MLT
    FROM HoaDon AS T1
    INNER JOIN RelevantDanhBa AS T2 ON T1.DANHBA = T2.DANHBA
    LEFT JOIN LatestPeriodData LPD ON T1.DANHBA = LPD.DANHBA AND LPD.rn = 1
    WHERE (T1.NAM * 100 + T1.KY) BETWEEN ${startPeriod} AND ${endPeriod}
    ${dotCondition} ${gbCondition}
    ORDER BY T1.DANHBA, T1.NAM, T1.KY
  `

    console.log('Executing Lateness Analysis Query...')
    const rawData = await executeSqlQuery('f_Select_SQL_Thutien', query) as any[]

    if (!rawData || rawData.length === 0) {
        return {
            summary: {
                totalCustomers: 0,
                totalDebt: 0,
                avgRate: 0,
                maxRate: 0,
                minRate: 0,
                excellentCount: 0,
                classificationCounts: {}
            },
            details: []
        }
    }

    // 2. Process Data
    const customersMap = new Map<string, CustomerLatenessStatus>()
    const customerRecordsMap = new Map<string, any[]>()

    // Normalize data and group by DANHBA
    rawData.forEach((row: any) => {
        const danhBa = row.DANHBA?.toString().trim()
        if (!danhBa) return

        if (!customerRecordsMap.has(danhBa)) {
            customerRecordsMap.set(danhBa, [])
            // Initialize customer info
            customersMap.set(danhBa, {
                DANHBA: danhBa.padStart(11, '0'),
                TENKH: row.TENKH?.toString() || '',
                DIACHI: `${row.SO || ''} ${row.DUONG || ''}`.trim(),
                SO: row.SO?.toString() || '',
                DUONG: row.DUONG?.toString() || '',
                DOT: row.DOT?.toString() || '',
                TONGCONG_BD: parseFloat(row.TONGCONG_BD || '0'),
                MLT: row.MLT?.toString() || '',
                ON_TIME_RATE: 0,
                CLASSIFICATION: '',
                PAYMENT_STATUS_BY_PERIOD: {}
            })
        }
        customerRecordsMap.get(danhBa)?.push(row)
    })

    // 3. Calculate Rates
    // Generate list of valid periods for comparison if needed, but here we just iterate records.
    // Wait, we need to know Total Periods in range to calculate rate correctly? 
    // Old app: total_periods_summary = Unpaid + OnTime + Late (from records found).
    // Yes, it iterates 'df_full' which is merge of 'valid_periods' and 'df'.
    // IF a period is missing in DB (no bill), it might be ignored or counts as... ?
    // Old code: `df_full = pd.merge(full_periods... df, how="left")`. 
    // So it fills missing periods with "Chưa thanh toán" (fillna).
    // To replicate exactly, we must generate all periods between start and end.

    const allPeriods = generatePeriods(fromNam, fromKy, toNam, toKy)
    const details: CustomerLatenessStatus[] = []

    customersMap.forEach((customer, danhBa) => {
        const records = customerRecordsMap.get(danhBa) || []

        let onTimeCount = 0
        let totalCount = allPeriods.length
        const paymentStatusMap: Record<string, string> = {}

        allPeriods.forEach(p => {
            const periodKey = `${p.ky.toString().padStart(2, '0')}/${p.nam}`
            const ky_nam_sort = p.nam * 100 + p.ky

            // Find bill for this period
            // Note: records query filters by range, so it should be there if exists.
            // But multiple bills for same period? Old app: `drop_duplicates(subset=["DANHBA", "NAM", "KY"], keep="last")`
            const bill = records.find((r: any) =>
                parseInt(r.NAM) === p.nam && parseInt(r.KY) === p.ky
            )

            let status = 'Chưa thanh toán' // Default if no bill found or no payment date (and fillna logic)

            // Logic from Python:
            // if NGAYGIAI is NA: "Chưa thanh toán"
            // if KY == NGAYGIAI.month and NAM == NGAYGIAI.year: "Đúng hạn"
            // else: "Trễ hạn"

            if (bill) {
                if (!bill.NGAYGIAI) {
                    status = 'Chưa thanh toán'
                } else {
                    // Parse NGAYGIAI
                    // SQL format usually YYYY-MM-DDTHH:mm:ss or similar
                    try {
                        const paymentDate = new Date(bill.NGAYGIAI)
                        if (isNaN(paymentDate.getTime())) {
                            status = 'Chưa thanh toán' // Fallback
                        } else {
                            paymentStatusMap[periodKey] = formatDate(paymentDate)

                            if (paymentDate.getMonth() + 1 === p.ky && paymentDate.getFullYear() === p.nam) {
                                status = 'Đúng hạn'
                                onTimeCount++
                            } else {
                                status = 'Trễ hạn'
                            }
                        }
                    } catch {
                        status = 'Chưa thanh toán'
                    }
                }
            } else {
                // No bill for this period -> count as "Chưa thanh toán" 
                // (Assuming bill exists but fetched via LEFT JOIN in Python logic with full_periods)
                status = 'Chưa thanh toán'
            }

            // If status is not a date string (i.e. it is a status label), set it
            if (!paymentStatusMap[periodKey]) {
                paymentStatusMap[periodKey] = status
            }
        })

        // Calculate Rate
        const rate = totalCount > 0 ? (onTimeCount / totalCount) * 100 : 0
        customer.ON_TIME_RATE = parseFloat(rate.toFixed(2))

        // Classify
        customer.CLASSIFICATION = classifyRate(rate)

        // Assign map
        customer.PAYMENT_STATUS_BY_PERIOD = paymentStatusMap

        details.push(customer)
    })

    // 4. Summarize
    const rates = details.map(d => d.ON_TIME_RATE)
    const classificationCounts: Record<string, number> = {}

    details.forEach(d => {
        classificationCounts[d.CLASSIFICATION] = (classificationCounts[d.CLASSIFICATION] || 0) + 1
    })

    // Sort details
    // By classification priority? or Name?
    // Old app: sort_values(by=['DOT_numeric', 'DANHBA'])
    details.sort((a, b) => {
        const dotA = parseInt(a.DOT) || 0
        const dotB = parseInt(b.DOT) || 0
        if (dotA !== dotB) return dotA - dotB
        return a.DANHBA.localeCompare(b.DANHBA)
    })

    return {
        summary: {
            totalCustomers: details.length,
            totalDebt: details.reduce((sum, d) => sum + d.TONGCONG_BD, 0),
            avgRate: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0,
            maxRate: Math.max(...rates, 0),
            minRate: Math.min(...rates, 0),
            excellentCount: details.filter(d => d.ON_TIME_RATE >= 80).length,
            classificationCounts
        },
        details
    }
}

/**
 * Helper: Generate Periods List
 */
function generatePeriods(fromNam: number, fromKy: number, toNam: number, toKy: number) {
    const periods = []
    let currentNam = fromNam
    let currentKy = fromKy

    while (currentNam < toNam || (currentNam === toNam && currentKy <= toKy)) {
        periods.push({ nam: currentNam, ky: currentKy })

        currentKy++
        if (currentKy > 12) {
            currentKy = 1
            currentNam++
        }
    }
    return periods
}

/**
 * Helper: Format Date
 */
function formatDate(d: Date): string {
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
}

/**
 * Helper: Classify Rate
 */
export function classifyRate(rate: number): string {
    if (rate >= 90) return "⭐ Xuất sắc (90-100%)"
    if (rate >= 70) return "✅ Tốt (70-89%)"
    if (rate >= 50) return "⚠️ Trung bình (50-69%)"
    if (rate >= 30) return "❌ Kém (30-49%)"
    return "🔴 Rất kém (<30%)"
}
