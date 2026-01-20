'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/lib/database.types'

interface ReadingItem {
  customerId: string
  customerCode: string
  fullName: string
  meterNumber: string
  oldIndex: number
  newIndex: number | ''
  consumption: number
  hasReading: boolean 
  readingId?: string
}

export default function ReadingsPage() {
  const [loading, setLoading] = useState(true)
  const [readings, setReadings] = useState<ReadingItem[]>([])
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchReadingsData()
  }, [selectedMonth, selectedYear])

  const fetchReadingsData = async () => {
    setLoading(true)
    try {
      // 1. Get all active customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('customer_code', { ascending: true }) as any // Force any

      if (!customers) return

      // 2. Get readings for selected month
      const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const endStr = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

      const { data: currentReadings } = await supabase
        .from('meter_readings')
        .select('*')
        .gte('reading_date', startStr)
        .lte('reading_date', endStr) as any

      // 3. Get readings for PREVIOUS month (to fetch old index)
      let prevMonth = selectedMonth - 1
      let prevYear = selectedYear
      if (prevMonth === 0) { prevMonth = 12; prevYear -= 1 }
      
      const prevStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
      const prevEndStr = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

      const { data: previousReadings } = await supabase
        .from('meter_readings')
        .select('customer_id, meter_value')
        .gte('reading_date', prevStartStr)
        .lte('reading_date', prevEndStr) as any
      
      // Map to optimize lookup
      const currentMap = new Map((currentReadings as any[])?.map(r => [r.customer_id, r]) || [])
      const prevMap = new Map((previousReadings as any[])?.map(r => [r.customer_id, r]) || [])

      // 4. Merge data
      const items: ReadingItem[] = (customers as any[]).map(cust => {
        const curr = currentMap.get(cust.id)
        const prev = prevMap.get(cust.id)
        
        const oldIndex = prev ? prev.meter_value : 0
        const newIndex = curr ? curr.meter_value : ''
        
        return {
          customerId: cust.id,
          customerCode: cust.customer_code,
          fullName: cust.full_name,
          meterNumber: cust.meter_number || '',
          oldIndex: oldIndex,
          newIndex: newIndex,
          consumption: (typeof newIndex === 'number') ? (newIndex - oldIndex) : 0,
          hasReading: !!curr,
          readingId: curr?.id
        }
      })

      setReadings(items)

    } catch (error) {
      console.error('Error fetching readings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleIndexChange = (customerId: string, value: string) => {
    const val = value === '' ? '' : Number(value)
    
    setReadings(prev => prev.map(item => {
      if (item.customerId === customerId) {
        const consumption = typeof val === 'number' ? (val - item.oldIndex) : 0
        return { ...item, newIndex: val as any, consumption }
      }
      return item
    }))
  }

  const handleSave = async (item: ReadingItem) => {
    if (item.newIndex === '') return
    if (Number(item.newIndex) < item.oldIndex) {
      alert('Chỉ số mới không được nhỏ hơn chỉ số cũ!')
      return
    }

    try {
      const readingDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date().getDate()}`

      // Construct payload
      const payload = {
         customer_id: item.customerId,
         meter_value: Number(item.newIndex),
         reading_date: readingDate,
      }

      let error
      if (item.hasReading && item.readingId) {
        // Update
        const { error: updateError } = await supabase
          .from('meter_readings')
          // @ts-ignore
          .update(payload)
          .eq('id', item.readingId)
        error = updateError
      } else {
        // Insert
        const { error: insertError, data } = await supabase
          .from('meter_readings')
          .insert([payload] as any)
          .select()
        
        if (data) {
           setReadings(prev => prev.map(r => r.customerId === item.customerId ? ({...r, hasReading: true, readingId: (data[0] as any).id }) : r))
        }
        error = insertError
      }

      if (error) throw error
      // TODO: Trigger Invoice Creation here

    } catch (err: any) {
      alert('Lỗi lưu chỉ số: ' + err.message)
    }
  }

  const filteredReadings = readings.filter(r => 
    r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customerCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ghi Chỉ Số Nước</h1>
            <p className="mt-1 text-sm text-gray-500">
              Nhập chỉ số nước cho kỳ {selectedMonth}/{selectedYear}
            </p>
          </div>
          
           <div className="mt-4 flex gap-4 md:mt-0">
             <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(Number(e.target.value))}
               className="block w-24 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
             >
               {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                 <option key={m} value={m}>Tháng {m}</option>
               ))}
             </select>
             <select
               value={selectedYear}
               onChange={(e) => setSelectedYear(Number(e.target.value))}
               className="block w-32 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
             >
               {[currentYear, currentYear - 1].map(y => (
                 <option key={y} value={y}>Năm {y}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-lg">
          <input
            type="text"
            className="block w-full pl-4 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="🔍 Tìm khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Readings Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {loading ? (
             <div className="p-12 text-center text-gray-500">Đang tải danh sách...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số ĐH</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chỉ số cũ</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chỉ số mới</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tiêu thụ (m³)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReadings.map((item) => (
                    <tr key={item.customerId} className={item.hasReading ? "bg-green-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.fullName}</div>
                        <div className="text-sm text-gray-500">{item.customerCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.meterNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                        {item.oldIndex}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input 
                          type="number"
                          className="w-24 text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-1"
                          value={item.newIndex}
                          onChange={(e) => handleIndexChange(item.customerId, e.target.value)}
                          placeholder="Nhập..."
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">
                        {item.consumption > 0 ? item.consumption : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button 
                          onClick={() => handleSave(item)}
                          className={`px-3 py-1 rounded border shadow-sm text-xs font-medium ${
                            item.hasReading 
                              ? 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                              : 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                          }`}
                        >
                          {item.hasReading ? 'Cập nhật' : 'Lưu'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
