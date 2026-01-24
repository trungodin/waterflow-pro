'use client'

import { useEffect, useState } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    title?: string
    width?: string // e.g. 'max-w-4xl'
}

export default function Modal({ isOpen, onClose, children, title, width = 'max-w-lg' }: ModalProps) {
    const [show, setShow] = useState(isOpen)

    useEffect(() => {
        setShow(isOpen)
    }, [isOpen])

    if (!show) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">

                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-filter backdrop-blur-sm"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${width}`}>
                    {title && (
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
