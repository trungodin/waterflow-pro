'use client'

import React, { Component, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

/**
 * Error Boundary Component
 * Catches runtime errors in child components and displays a fallback UI
 * Prevents the entire app from crashing due to unhandled errors
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                        <div className="mb-6">
                            <svg
                                className="w-20 h-20 mx-auto text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            Đã xảy ra lỗi
                        </h1>

                        <p className="text-gray-600 mb-6">
                            Xin lỗi, đã có lỗi xảy ra khi tải trang này. Vui lòng thử lại.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                                <p className="text-xs font-mono text-red-800 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => this.setState({ hasError: false })}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Thử lại
                            </button>

                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Về Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
