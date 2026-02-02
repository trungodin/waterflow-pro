
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const formatCurrency = (val: number | string) => {
    const num = Number(val);
    if (isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

export const formatNumber = (val: number | string) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('vi-VN').format(num)
}
