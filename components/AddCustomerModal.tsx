'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CustomerInsert } from '@/lib/database.types'

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess }: AddCustomerModalProps) {
  const [formData, setFormData] = useState<CustomerInsert>({
    customer_code: '',
    full_name: '',
    phone: '',
    email: '',
    address: '',
    ward: '',
    district: '',
    city: 'TP. HCM',
    meter_number: '',
    status: 'active'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Simple validation
    if (!formData.customer_code || !formData.full_name) {
       setError('Vui lòng điền Mã KH và Tên Khách hàng')
       setLoading(false)
       return
    }

    try {
      const { error } = await supabase
        .from('customers')
        .insert([formData] as any)

      if (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error('Mã khách hàng đã tồn tại!')
        }
        throw error
      }

      onSuccess()
      onClose()
      // Reset form
      setFormData({
        customer_code: '',
        full_name: '',
        phone: '',
        email: '',
        address: '',
        ward: '',
        district: '',
        city: 'TP. HCM',
        meter_number: '',
        status: 'active'
      })
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi thêm khách hàng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Thêm Khách hàng mới
                </h3>
                
                {error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                  {/* Mã KH */}
                  <div className="sm:col-span-3">
                    <label htmlFor="customer_code" className="block text-sm font-medium text-gray-700">Mã KH <span className="text-red-500">*</span></label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="customer_code"
                        id="customer_code"
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        placeholder="VD: KH0001"
                        value={formData.customer_code}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                   {/* Tên KH */}
                   <div className="sm:col-span-3">
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Họ và tên <span className="text-red-500">*</span></label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="full_name"
                        id="full_name"
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        value={formData.full_name}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="phone"
                        id="phone"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        value={formData.phone || ''}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Meter Number */}
                  <div className="sm:col-span-3">
                    <label htmlFor="meter_number" className="block text-sm font-medium text-gray-700">Số đồng hồ</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="meter_number"
                        id="meter_number"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        value={formData.meter_number || ''}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="address"
                        id="address"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        value={formData.address || ''}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Ward & District */}
                  <div className="sm:col-span-3">
                    <label htmlFor="ward" className="block text-sm font-medium text-gray-700">Phường/Xã</label>
                    <div className="mt-1">
                       <input
                        type="text"
                        name="ward"
                        id="ward"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        value={formData.ward || ''}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700">Quận/Huyện</label>
                    <div className="mt-1">
                       <input
                        type="text"
                        name="district"
                        id="district"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        value={formData.district || ''}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-3">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Trạng thái</label>
                    <div className="mt-1">
                      <select
                        id="status"
                        name="status"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option value="active">Hoạt động</option>
                        <option value="suspended">Tạm ngưng</option>
                        <option value="inactive">Ngừng hoạt động</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-300"
            >
              {loading ? 'Đang lưu...' : 'Lưu khách hàng'}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
