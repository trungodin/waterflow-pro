'use server'

import { fetchSql } from '../soap-api'
import { getOnOffData } from '../googlesheets'

interface DebtFilterParams {
  nam: number
  ky: number
  minTongKy?: number
  minTongCong?: number
  excludeCodeMoi?: string[]
  dotFilter?: string[]
  gbFilter?: string[]
  fileDbList?: string[]
  fileFilterMode?: 'include' | 'exclude'
  limit?: number
  searchTerm?: string
}

/**
 * Server Action to perform the heavy "Loc Du Lieu Ton" logic.
 * OPTIMIZED: Uses Lazy BGW Filter (Check BGW only for candidates)
 */
export async function getDebtData(params: DebtFilterParams) {
  try {
    const { 
      nam, 
      ky, 
      minTongKy = 2, 
      minTongCong = 0, 
      excludeCodeMoi = [], 
      dotFilter = [], 
      gbFilter = [], 
      fileDbList = [],
      fileFilterMode = 'include',
      limit = 0 
    } = params
    
    console.log(`[DEBT FILTER] Starting with params:`, { nam, ky, minTongKy, minTongCong, excludeCodeMoi, dotFilter, gbFilter, fileDbListCount: fileDbList.length, fileFilterMode })
    
    // === BƯỚC 1: Query dữ liệu từ 3 nguồn ===
    // HoaDon: Only add DOT filter to SQL (NOT GB - we filter GB later)
    let sqlHoaDon = `SELECT DANHBA, GB, TONGCONG, KY, NAM, TENKH, SO, DUONG, SOHOADON, DOT FROM HoaDon WHERE NGAYGIAI IS NULL AND NAM <= ${nam}`
    if (dotFilter.length > 0) {
        const safeDots = dotFilter.filter(d => /^\d+$/.test(d))
        if (safeDots.length > 0) {
            sqlHoaDon += ` AND DOT IN (${safeDots.join(',')})`
        }
    }
    
    const sqlDocSo = `SELECT DanhBa, CodeMoi, CoCu FROM DocSo WHERE Nam = ${nam} AND Ky = ${ky}`
    const sqlKhachHang = `SELECT DanhBa, MLT2, SoMoi, SoThan, Hieu, HopBaoVe, SDT FROM KhachHang`

    const [docSoData, hoaDonData, khachHangData, onOffData] = await Promise.all([
        fetchSql('f_Select_SQL_Doc_so', sqlDocSo),
        fetchSql('f_Select_SQL_Thutien', sqlHoaDon),
        fetchSql('f_Select_SQL_Doc_so', sqlKhachHang),
        getOnOffData() 
    ])

    if (!hoaDonData || hoaDonData.length === 0) {
        console.log('[DEBT FILTER] No HoaDon data found')
        return []
    }

    console.log(`[DEBT FILTER] Fetched data: DocSo=${docSoData.length}, HoaDon=${hoaDonData.length}, KhachHang=${khachHangData.length}, OnOff=${onOffData.length}`)

    // === BƯỚC 2: Merge 3 DataFrames ===
    const khachHangMap = new Map(khachHangData.map((d: any) => [d.DanhBa?.trim(), d]))
    const docSoMap = new Map(docSoData.map((d: any) => [d.DanhBa?.trim(), d]))
    
    const mergedRows = hoaDonData.map((inv: any) => {
        const db = inv.DANHBA?.trim()
        const kh = khachHangMap.get(db) || {}
        const ds = docSoMap.get(db) || {}
        
        return {
            DANHBA: db,
            GB: inv.GB?.trim(),
            TONGCONG: parseFloat(inv.TONGCONG) || 0,
            KY: parseInt(inv.KY),
            NAM: parseInt(inv.NAM),
            TENKH: inv.TENKH,
            SO: inv.SO,
            DUONG: inv.DUONG,
            SOHOADON: inv.SOHOADON?.trim(),
            DOT: inv.DOT?.trim(),
            // KH info
            MLT2: kh.MLT2,
            SoMoi: kh.SoMoi,
            SoThan: kh.SoThan,
            Hieu: kh.Hieu,
            HopBaoVe: kh.HopBaoVe,
            SDT: kh.SDT,
            // DocSo info
            CodeMoi: ds.CodeMoi?.trim().toUpperCase(),
            CoCu: ds.CoCu
        }
    })
    
    console.log(`[DEBT FILTER] After merge: ${mergedRows.length} rows`)

    // === BƯỚC 3: Lọc danh bạ từ file Excel (mode "Loại trừ") ===
    let filteredRows = mergedRows
    if (fileDbList.length > 0 && fileFilterMode === 'exclude') {
        const fileDbSet = new Set(fileDbList.map(d => d.trim()))
        filteredRows = filteredRows.filter(row => !fileDbSet.has(row.DANHBA))
        console.log(`[DEBT FILTER] File exclude: ${mergedRows.length} → ${filteredRows.length}`)
    }

    // === BƯỚC 4, 5, 6: Các bộ lọc cơ bản ===
    // CodeMoi Empty
    filteredRows = filteredRows.filter(row => row.CodeMoi && row.CodeMoi !== '')
    
    // CodeMoi exclude list
    if (excludeCodeMoi.length > 0) {
        const excludeSet = new Set(excludeCodeMoi.map(c => c.toUpperCase()))
        filteredRows = filteredRows.filter(row => !excludeSet.has(row.CodeMoi))
    }
    
    // GB Filter
    if (gbFilter.length > 0) {
        const gbSet = new Set(gbFilter.map(g => g.trim()))
        filteredRows = filteredRows.filter(row => gbSet.has(row.GB))
        console.log(`[DEBT FILTER] After GB filter: ${filteredRows.length} rows`)
    }

    // === BƯỚC 7: (OPTIMIZED) AGGREGATE LẦN 1 (Raw) ===
    console.log(`[DEBT FILTER] ⚡ Aggregating ${filteredRows.length} rows (Pre-BGW)...`)
    
    const aggregatedDebt = new Map<string, any>()
    const invoicesByCustomer = new Map<string, any[]>() // Store all invoices for later BGW check & Shutoff logic

    filteredRows.forEach(row => {
        const db = row.DANHBA
        if (!db) return

        if (!aggregatedDebt.has(db)) {
            aggregatedDebt.set(db, {
                DANHBA: db,
                TEN: row.TENKH, // Fixed: TEN -> TENKH
                DIACHI: `${row.SO || ''} ${row.DUONG || ''}`.trim(), // Fixed: Combine SO + DUONG
                MLT2: row.MLT2, // Fixed: LOLOT -> MLT2
                DOT: row.DOT,
                // QUAN: row.QUAN, // Removed non-existent
                // PHUONG: row.PHUONG, // Removed non-existent
                // CUM: row.CUM, // Removed non-existent
                TONGCONG: 0,
                TONGKY: 0,
                KY_LIST: [], // Just for debug
                SOHOADON_LIST: [], // Important for BGW
                TENKH: row.TENKH,
                SO: row.SO,
                DUONG: row.DUONG,
                GB: row.GB,
                SoMoi: row.SoMoi,
                SoThan: row.SoThan,
                Hieu: row.Hieu,
                CodeMoi: row.CodeMoi,
                CoCu: row.CoCu,
                HopBaoVe: row.HopBaoVe,
                SDT: row.SDT
            })
            invoicesByCustomer.set(db, [])
        }
        
        const customer = aggregatedDebt.get(db)
        customer.TONGCONG += (row.TONGCONG || 0)
        customer.TONGKY += 1
        customer.KY_LIST.push(`${row.NAM}-${row.KY}`)
        customer.SOHOADON_LIST.push(row.SOHOADON)
        
        invoicesByCustomer.get(db)?.push(row)
    })

    console.log(`[DEBT FILTER] Unique customers (Pre-Filter): ${aggregatedDebt.size}`)

    // === BƯỚC 8: PRE-FILTER CANDIDATES ===
    // Chọn ra khách hàng tiềm năng thỏa mãn điều kiện Min
    // (Ta chưa trừ BGW, nên nếu thỏa mãn ở đây thì mới có cơ hội thỏa mãn sau khi trừ BGW)
    let preCandidates: any[] = []
    
    aggregatedDebt.forEach(cust => {
        let pass = true
        if (minTongKy !== undefined && cust.TONGKY < minTongKy) pass = false
        if (minTongCong !== undefined && cust.TONGCONG < minTongCong) pass = false
        
        if (pass) preCandidates.push(cust)
    })
    
    console.log(`[DEBT FILTER] Candidates for BGW check: ${preCandidates.length} customers`)

    // === BƯỚC 9: LAZY BGW CHECK (Post-Check) ===
    let finalCandidates: any[] = []

    if (preCandidates.length > 0) {
        // Collect invoices of candidates
        const candidateInvoices: string[] = []
        preCandidates.forEach(cust => {
            if (cust.SOHOADON_LIST) {
                cust.SOHOADON_LIST.forEach((inv: string) => {
                    if (inv) candidateInvoices.push(inv)
                })
            }
        })
        
        const uniqueCandidateInvoices = [...new Set(candidateInvoices)]
        console.log(`[DEBT FILTER] ⚡ Checking BGW for ONLY ${uniqueCandidateInvoices.length} invoices...`)
        
        const bgwPaidInvoices = new Set<string>()
        
        if (uniqueCandidateInvoices.length > 0) {
            try {
                // Prepare BGW chunks
                // Reduced chunk size to 100 to prevent server overload/timeout
                const chunkSize = 100 
                console.log(`[DEBT FILTER] ⚡ Processing BGW sequentially with retries (Chunk size: ${chunkSize})...`)
                
                for (let i = 0; i < uniqueCandidateInvoices.length; i += chunkSize) {
                    const chunk = uniqueCandidateInvoices.slice(i, i + chunkSize)
                    const soHoaDonList = chunk.map(s => `'${s}'`).join(',')
                    
                    let attempt = 0
                    let success = false
                    
                    while (attempt < 3 && !success) {
                        try {
                            const sqlBGW = `SELECT SHDon FROM BGW_HD WHERE SHDon IN (${soHoaDonList})`
                            const bgwData = await fetchSql('f_Select_SQL_Nganhang', sqlBGW)
                            
                            if (bgwData && bgwData.length > 0) {
                                bgwData.forEach((b: any) => {
                                    if (b.SHDon) bgwPaidInvoices.add(b.SHDon.trim())
                                })
                            }
                            success = true // Mark as success if no error thrown
                        } catch (err: any) {
                            attempt++
                            console.warn(`[DEBT FILTER] BGW chunk failed (Attempt ${attempt}/3): ${err.message}`)
                            if (attempt >= 3) {
                                console.error(`[DEBT FILTER] CRITICAL: Skipping chunk after 3 failed attempts.`)
                            } else {
                                // Wait 1s before retrying
                                await new Promise(res => setTimeout(res, 1000))
                            }
                        }
                    }
                }

                console.log(`[DEBT FILTER] Found ${bgwPaidInvoices.size} paid invoices via BGW in active set`)
            } catch (error) {
                console.error('[DEBT FILTER] BGW Check Error:', error)
            }
        }
        
        // === BƯỚC 10: RE-CALCULATE & FINAL FILTER ===
        for (const cust of preCandidates) {
            const db = cust.DANHBA
            const originalInvoices = invoicesByCustomer.get(db) || []
            
            // Filter out paid invoices
            const validInvoices = originalInvoices.filter(inv => !bgwPaidInvoices.has(inv.SOHOADON))
            
            // Re-calculate totals
            let newTongCong = 0
            let newTongKy = 0
            const newKyNamList = new Set<string>()
            
            validInvoices.forEach(inv => {
                newTongCong += (inv.TONGCONG || 0)
                newTongKy += 1
                newKyNamList.add(`${String(inv.KY).padStart(2, '0')}/${inv.NAM}`)
            })
            
            // Update customer object
            cust.TONGCONG = newTongCong
            cust.TONGKY = newTongKy
            cust.KY_NAM_LIST = newKyNamList
            
            // Update global map for Shutoff Logic (IMPORTANT)
            invoicesByCustomer.set(db, validInvoices)

            // Final Filter Check
            let pass = true
            if (minTongKy !== undefined && cust.TONGKY < minTongKy) pass = false
            if (minTongCong !== undefined && cust.TONGCONG < minTongCong) pass = false
            
            if (pass) finalCandidates.push(cust)
        }
    } else {
        finalCandidates = []
    }

    console.log(`[DEBT FILTER] After BGW & Re-Calc: ${preCandidates.length} → ${finalCandidates.length} customers`)

    // === BƯỚC 11: SHUTOFF LOGIC (Xử lý khóa nước) ===
    // Use invoicesByCustomer which now contains only VALID (unpaid) invoices
    const onOffGrouped = new Map<string, any[]>()
    for (const record of onOffData) {
        const db = record.DanhBa?.trim()
        if (db) {
            if (!onOffGrouped.has(db)) onOffGrouped.set(db, [])
            onOffGrouped.get(db)!.push(record)
        }
    }
    
    // Sort and keep latest OnOf record
    const onOffMap = new Map()
    for (const [db, records] of onOffGrouped) {
        const sorted = records.sort((a, b) => {
            const dateA = parseDate(a.NgayKhoa)
            const dateB = parseDate(b.NgayKhoa)
            if (!dateA && !dateB) return 0
            if (!dateA) return 1
            if (!dateB) return -1
            return dateB.getTime() - dateA.getTime()
        })
        onOffMap.set(db, sorted[0])
    }
    
    let totalLockedCustomers = 0
    let excludedByShutoff = 0
    const result = []

    for (const cust of finalCandidates) {
        const db = cust.DANHBA
        const onOff = onOffMap.get(db)
        
        let shouldExclude = false
        
        if (onOff) {
            const status = (onOff.TinhTrang || '').toLowerCase().trim()
            const lockedStatuses = ['đang khóa', 'đang khoá', 'đã hủy', 'dang khoa', 'da huy']
            const isLocked = lockedStatuses.includes(status)
            
            if (isLocked) {
                totalLockedCustomers++
                
                const lockDate = parseDate(onOff.NgayKhoa)
                if (lockDate) {
                    let hasDebtAfterShutoff = false
                    const validInvoices = invoicesByCustomer.get(db) || []
                    
                    for (const inv of validInvoices) {
                        // Re-construct logic for period overlap
                        // Note: inv.NAM and inv.KY are integers
                        const periodStart = new Date(inv.NAM, inv.KY - 1, 1)
                        const periodEnd = new Date(inv.NAM, inv.KY, 0)
                        periodEnd.setHours(23, 59, 59, 999)
                        
                        // Check if lockDate falls WITHIN this period
                        if (lockDate >= periodStart && lockDate <= periodEnd) {
                            hasDebtAfterShutoff = false
                            break
                        }
                        
                        // Check if period STARTS AFTER lockDate AND has actual debt
                        // (Usually inv.TONGCONG > 0 is true since we filtered by row.CodeMoi...)
                        if (periodStart > lockDate && inv.TONGCONG > 0) {
                            hasDebtAfterShutoff = true
                        }
                    }
                    
                    if (!hasDebtAfterShutoff) {
                        shouldExclude = true
                        excludedByShutoff++
                    }
                }
            }
        }
        
        if (!shouldExclude) {
            result.push({
                DanhBa: db,
                TenKH: cust.TENKH,
                SoNha: cust.SO,
                Duong: cust.DUONG,
                GB: cust.GB, // Added GB
                gb: cust.GB, // Added lowercase gb just in case
                TinhTrang: onOff?.TinhTrang || 'Bình thường',
                TongKy: cust.TONGKY,
                TongNo: cust.TONGCONG,
                KyNam: Array.from(cust.KY_NAM_LIST).sort().join(', '),
                NhomKhoa: onOff?.NhomKhoa || '',
                NgayMo: onOff?.NgayMo || '',
                CodeMoi: cust.CodeMoi,
                Dot: cust.DOT,
                MLT2: cust.MLT2,
                SoThan: cust.SoThan,
                SoMoi: cust.SoMoi,
                CoCu: cust.CoCu
            })
        }
    }
    
    console.log(`[SHUTOFF SUMMARY] Total locked: ${totalLockedCustomers}, Excluded: ${excludedByShutoff}, Kept: ${totalLockedCustomers - excludedByShutoff}`)
    console.log(`[DEBT FILTER] Final result: ${result.length} customers`)

    // === BƯỚC 12: Sort & Limit ===
    result.sort((a, b) => {
        const mlt2A = String(a.MLT2 || '')
        const mlt2B = String(b.MLT2 || '')
        if (mlt2A !== mlt2B) return mlt2A.localeCompare(mlt2B)
        const dotA = String(a.Dot || '')
        const dotB = String(b.Dot || '')
        return dotA.localeCompare(dotB)
    })

    if (limit && limit > 0) {
        result.sort((a, b) => b.TongNo - a.TongNo)
        const limited = result.slice(0, limit)
        return limited
    }

    return result

  } catch (error) {
    console.error('[DEBT FILTER] Error:', error)
    throw error
  }
}

/**
 * Helper: Parse Vietnamese date
 */
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null
    try {
        if (dateStr.includes('/')) {
            const [datePart, timePart] = dateStr.split(' ')
            const parts = datePart.split('/')
            if (parts.length === 3) {
                const p0 = parseInt(parts[0])
                let isoDate: string
                if (p0 > 31) { 
                    isoDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
                } else { 
                    isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
                }
                return timePart ? new Date(`${isoDate}T${timePart}`) : new Date(isoDate)
            }
        }
        const d = new Date(dateStr)
        return isNaN(d.getTime()) ? null : d
    } catch { 
        return null 
    }
}
