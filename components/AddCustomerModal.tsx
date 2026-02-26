'use client'

import { useState } from 'react'
import { fetchCustomerFromLegacy, insertWaterLockStatus } from '@/app/payments/customer-actions'

export default function AddCustomerModal({ isOpen, onClose, onAdded }: { isOpen: boolean, onClose: () => void, onAdded: () => void }) {
    const [danhBo, setDanhBo] = useState('')
    const [tenKH, setTenKH] = useState('')
    const [soNha, setSoNha] = useState('')
    const [duong, setDuong] = useState('')
    const [isFetching, setIsFetching] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null;

    const handleFetchInfo = async () => {
        if (!danhBo) {
            setError('Vui lòng nhập Danh bộ để tìm kiếm!');
            return;
        }

        setError('');
        setIsFetching(true);
        try {
            const result = await fetchCustomerFromLegacy(danhBo);
            if (result.success && result.data) {
                setTenKH(result.data.ten_kh || '');
                setSoNha(result.data.so_nha || '');
                setDuong(result.data.duong || '');
                setError('');
            } else {
                setError(result.error || 'Không tìm thấy khách hàng. Bạn có thể tự nhập tay!');
            }
        } catch (e: any) {
            setError('Lỗi khi tải dữ liệu: ' + e.message);
        } finally {
            setIsFetching(false);
        }
    }

    const handleSave = async () => {
        if (!danhBo || !tenKH || !soNha || !duong) {
            setError('Vui lòng điền đầy đủ các mục bắt buộc!');
            return;
        }

        setError('');
        setIsSaving(true);
        try {
            const result = await insertWaterLockStatus({
                danh_bo: danhBo,
                ten_kh: tenKH,
                so_nha: soNha,
                duong: duong
            });

            if (result.success) {
                alert('Đã thêm khách hàng vào hệ thống ĐMN thành công!');
                setDanhBo(''); setTenKH(''); setSoNha(''); setDuong(''); // Reset form
                onAdded(); // Reload background
                onClose(); // Close modal
            } else {
                setError('Lỗi khi lưu bảng: ' + result.error);
            }
        } catch (e: any) {
            setError('Có lỗi ứng dụng: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
                <div className="bg-blue-600 p-4 shrink-0 flex items-center justify-between text-white">
                    <h3 className="font-bold text-lg">➕ THÊM KHÁCH HÀNG ĐMN</h3>
                    <button onClick={onClose} className="hover:bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center transition-colors font-bold text-xl leading-none">
                        ×
                    </button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm font-bold border border-red-200 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">🔍 Nhập Danh Bộ <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={danhBo}
                                    onChange={(e) => setDanhBo(e.target.value)}
                                    placeholder="Ví dụ: 01010101011"
                                    className="flex-1 px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono font-semibold"
                                />
                                <button 
                                    onClick={handleFetchInfo}
                                    disabled={isFetching || !danhBo}
                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap transition-colors"
                                >
                                    {isFetching ? '⏳ Đang tìm...' : '🔎 Tìm'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 italic">*Nhập danh bộ để tìm kiếm</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tên khách hàng <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                value={tenKH}
                                onChange={(e) => setTenKH(e.target.value)}
                                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Số nhà <span className="text-red-500">*</span></label>
                                <input 
                                    type="text"
                                    value={soNha}
                                    onChange={(e) => setSoNha(e.target.value)}
                                    className="w-full px-4 py-2 text-gray-900 font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Đường <span className="text-red-500">*</span></label>
                                <input 
                                    type="text"
                                    value={duong}
                                    onChange={(e) => setDuong(e.target.value)}
                                    className="w-full px-4 py-2 text-gray-900 font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-[0_3px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[3px] flex items-center gap-2 transition-all"
                    >
                        {isSaving ? '⏳ Đang lưu...' : '💾 Lưu'}
                    </button>
                </div>
            </div>
        </div>
    )
}
