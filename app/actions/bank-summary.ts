'use server'

import { executeSqlQuery } from '@/lib/soap'

/**
 * Re‑use the same query as AgentCollectionAnalysis – it already groups by bank.
 * This action simply forwards the data; the UI component will render a pie chart.
 */
export async function getBankSummary(startDate: string, endDate: string) {
  try {
    const query = `
      SELECT 
        SoBK, 
        (ISNULL(Giaban,0) + ISNULL(Thue,0) + ISNULL(Phi,0) + ISNULL(ThueDVTN,0)) AS TienBT 
      FROM ThuUNC 
      WHERE CAST(NgayThu AS DATE) BETWEEN '${startDate}' AND '${endDate}'
    `
    const result = await executeSqlQuery('f_Select_SQL_Thutien', query)
    if (!result || !Array.isArray(result)) return []

    const bankMap = new Map<string, { total: number; count: number }>()
    let grandTotal = 0
    result.forEach((row: any) => {
      const soBK = String(row.SoBK || '')
      const amount = parseFloat(row.TienBT || 0)
      const match = soBK.match(/Ai|Z|Pv|VT|VC|Vn|Pd|Da|E|^A|BP|V|^M|B|D|Q|P|K|OC|SG|B/)
      const code = match ? match[0] : null
      const bank = code && {
        '0': 'AGRIBANK', A: 'ACB', Ai: 'AIRPAY', B: 'BIDV', BP: 'AGRIBANK', D: 'DONGA', Da: 'DONGA', E: 'EXIMBANK', K: 'KHO BAC', M: 'MOMO', OC: 'OCEANBANK', P: 'PAYOO', Pv: 'PAYOO', Pd: 'PAYOO', Q: 'QUẦY', V: 'VIETTEL', VC: 'VIETCOMBANK', VT: 'VIETTIN', Vn: 'VNPAY', Z: 'ZALOPAY', SG: 'SAIGONBANK'
      }[code] || 'AGRIBANK'

      grandTotal += amount
      if (!bankMap.has(bank)) bankMap.set(bank, { total: 0, count: 0 })
      const entry = bankMap.get(bank)!
      entry.total += amount
      entry.count += 1
    })

    const data = Array.from(bankMap.entries()).map(([bank, stats]) => ({
      bank,
      total: stats.total,
      count: stats.count,
      percent: grandTotal > 0 ? (stats.total / grandTotal) * 100 : 0,
    }))
    // Sort alphabetically for consistency
    data.sort((a, b) => a.bank.localeCompare(b.bank))
    return data
  } catch (e) {
    console.error('Error in getBankSummary:', e)
    return []
  }
}
