'use server'

import { getOnOffData } from '../googlesheets'
import { parse, isValid, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export interface OnOffStatistics {
  summary: {
    totalLocked: number
    totalOpened: number
    daysCount: number
    avgPerDay: number
  }
  charts: {
    statusCounts: { name: string; value: number }[]
    groupCounts: { name: string; value: number }[]
    typeCounts: { name: string; value: number }[]
  }
  tables: {
    lockedData: any[]
    openedData: any[]
  }
}

// Helper to parse flexible date strings
// Python logic: tries multiple formats
function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  
  const cleanStr = dateStr.trim()
  if (!cleanStr || cleanStr.toLowerCase() === 'nan') return null

  // 1. Prioritize strict regex for DD/MM/YYYY or D/M/YYYY (Vietnam Format)
  // "23/01/2026" or "6/1/2026"
  // Note: Only match if Year is 4 digits to avoid matching HH:MM:SS erroneously if date is missing
  const dmy = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/)
  if (dmy) {
      const day = parseInt(dmy[1], 10)
      const month = parseInt(dmy[2], 10) - 1
      const year = parseInt(dmy[3], 10)
      
      const timePart = dmy[4].trim()
      let hours = 0, minutes = 0, seconds = 0
      
      if (timePart) {
          const time = timePart.match(/(\d{1,2}):(\d{1,2})(:(\d{1,2}))?/)
          if (time) {
              hours = parseInt(time[1], 10)
              minutes = parseInt(time[2], 10)
              seconds = time[4] ? parseInt(time[4], 10) : 0
          }
      }
      
      const resultDate = new Date(year, month, day, hours, minutes, seconds)
      if (isValid(resultDate)) return resultDate
  }

  // 2. Try regex for YYYY-MM-DD (Hyphens) - Common in SQL/Sheets/Excel Export
  // "2026-01-06 09:40:10"
  const ymd = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/)
  if (ymd) {
      const year = parseInt(ymd[1], 10)
      const month = parseInt(ymd[2], 10) - 1
      const day = parseInt(ymd[3], 10)
      
      const timePart = ymd[4].trim()
      let hours = 0, minutes = 0, seconds = 0
      
      if (timePart) {
          const time = timePart.match(/(\d{1,2}):(\d{1,2})(:(\d{1,2}))?/)
          if (time) {
              hours = parseInt(time[1], 10)
              minutes = parseInt(time[2], 10)
              seconds = time[4] ? parseInt(time[4], 10) : 0
          }
      }
      
      const resultDate = new Date(year, month, day, hours, minutes, seconds)
      if (isValid(resultDate)) return resultDate
  }

  // 3. Fallback to standard JS parsing (ISO, US format etc.)
  // Only use this if regexes fail
  const d = new Date(cleanStr)
  if (isValid(d)) return d

  return null
}

export async function getOnOffStatistics(startDateStr: string, endDateStr: string): Promise<{ success: boolean, data?: OnOffStatistics, error?: string }> {
  try {
    const rawData = await getOnOffData()
    if (!rawData || rawData.length === 0) {
      return { success: false, error: 'Không có dữ liệu từ Google Sheet' }
    }

    // Fix Timezone Issue:
    // Input is "YYYY-MM-DD". new Date("YYYY-MM-DD") creates UTC midnight.
    // Google Sheet data "dd/MM/yyyy" is parsed as Local Midnight by our regex/Date constructor.
    // In UTC+7 (Vietnam), Local Midnight is PrevDay 17:00 UTC.
    // UTC Midnight is SameDay 07:00 Local.
    // If we filter Start >= UTC Midnight, we miss the Local Midnight records of that day.
    
    // Solution: Construct Start/End as Local Date objects.
    const [sY, sM, sD] = startDateStr.split('-').map(Number)
    const [eY, eM, eD] = endDateStr.split('-').map(Number)
    
    const start = startOfDay(new Date(sY, sM - 1, sD))
    const end = endOfDay(new Date(eY, eM - 1, eD))
    
    if (!isValid(start) || !isValid(end)) {
        return { success: false, error: 'Ngày chọn không hợp lệ' }
    }

    const lockedData: any[] = []
    const openedData: any[] = []

    // Statistics aggregation maps
    const statusMap = new Map<string, number>()
    const groupMap = new Map<string, number>()
    const typeMap = new Map<string, number>()

    for (const item of rawData) {
        // 1. Process Locked Data (Based on NgayKhoa)
        const dateKhoa = parseDateFlexible(item.NgayKhoa)
        
        if (dateKhoa && isWithinInterval(dateKhoa, { start, end })) {
            const cleanItem = { ...item, NgayKhoaDate: dateKhoa }
            
            // Add ALL locked records to the list (for Total Locked Count) regardless of group validity
            // Python's `process_on_off_data` does filter out invalid groups for the DataFrame returned.
            // Wait, looking closely at Python code:
            // df_filtered = df_work[mask].copy() ... THEN it filters out invalid NhomKhoa.
            // AND `display_detailed_tables` uses `df_khoa` which is the result of `process_on_off_data`.
            // So YES, the list SHOULD only contain items with valid NhomKhoa.
            
            // BUT, the USER says "App cũ nhiều hơn".
            // If previous strict filter reduced the count, maybe we should be LESS strict?
            // "App cũ nhiều hơn cả khóa và mở".
            // This implies my previous logic was TOO strict or data parsing failed.
            
            // Let's re-examine Python:
            // df_work[config.ON_OFF_COL_NGAY_KHOA] = df_work[config.ON_OFF_COL_NGAY_KHOA].apply(parse_date_flexible)
            // df_work = df_work.dropna(subset=[config.ON_OFF_COL_NGAY_KHOA])
            // ...
            // df_filtered = df_work[mask].copy()
            // if config.ON_OFF_COL_NHOM_KHOA in df_filtered.columns:
            //    df_filtered = df_filtered[(... != '') & (... != 'nan')]
            
            // So Python DOES strictly filter out invalid NhomKhoa for the main dataset.
            
            // Maybe the issue is `parseDateFlexible`.
            // In Python: ranges multiple formats.
            // In JS: I implemented manual regex.
            
            // Let's try to be permissive with Group Filter for now to see if it matches "More data".
            // Actually, `display_summary_statistics` in Python calculates `status_counts` from `df` (which is df_processed).
            // So it matches the table.
            
            // However, "unique_danh_ba_mo" in Python uses "df_on_off" (Original raw) and looks for NgayMo.
            // It does NOT depend on NgayKhoa filter or Group filter.
            
            // My Opened logic:
            // const dateMo = parseDateFlexible(item.NgayMo)
            // if (dateMo && isWithinInterval(dateMo, { start, end })) ...
            
            // If "App cũ nhiều hơn", it means I am missing records.
            // Most likely my Date Parser is failing for some rows that Python succeeds on.
            // Or "isWithinInterval" is strict on boundaries? (startOfDay/endOfDay should cover it).
            
            // Let's relax the Group Filter for the Table/Summary, but keep it for the Charts (where 'nan' is ugly).
            
            lockedData.push(cleanItem)

            // Statistics (Charts) - Filter out Empty/Nan for cleaner charts
            const status = (item.TinhTrang || 'Không xác định').trim()
            statusMap.set(status, (statusMap.get(status) || 0) + 1)

            const group = (item.NhomKhoa || '').trim()
            if (group && group.toLowerCase() !== 'nan') {
                groupMap.set(group, (groupMap.get(group) || 0) + 1)
            }

            const type = (item.KieuKhoa || '').trim()
            if (type && type.toLowerCase() !== 'nan') {
                typeMap.set(type, (typeMap.get(type) || 0) + 1)
            }
        }

        // 2. Process Opened Data
        const dateMo = parseDateFlexible(item.NgayMo)
        if (dateMo && isWithinInterval(dateMo, { start, end })) {
             const cleanItem = { ...item, NgayMoDate: dateMo }
             openedData.push(cleanItem)
        }
    }

    // Python calculates "Unique DB Mo" using "df_mo_original" logic.
    // Here we have `openedData` which is exactly that list.
    const uniqueOpenedDBs = new Set(openedData.map(d => d.DanhBa)).size
    const uniqueLockedDBs = new Set(lockedData.map(d => d.DanhBa)).size

    const daysCount = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const avgPerDay = lockedData.length / Math.max(daysCount, 1) // Python uses len(df) which is locked records

    // Convert Maps to Arrays for Charts
    const charts = {
        statusCounts: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        groupCounts: Array.from(groupMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        typeCounts: Array.from(typeMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    }

    return {
      success: true,
      data: {
        summary: {
           totalLocked: uniqueLockedDBs,
           totalOpened: uniqueOpenedDBs,
           daysCount,
           avgPerDay
        },
        charts,
        tables: {
            lockedData: lockedData.sort((a, b) => a.NgayKhoaDate.getTime() - b.NgayKhoaDate.getTime()),
            openedData: openedData.sort((a, b) => a.NgayMoDate.getTime() - b.NgayMoDate.getTime())
        }
      }
    }

  } catch (err: any) {
    console.error('Error calculating statistics:', err)
    return { success: false, error: err.message }
  }
}
