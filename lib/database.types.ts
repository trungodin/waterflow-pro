// Database Types
// Auto-generated from Supabase schema

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'admin' | 'user' | 'viewer'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'user' | 'viewer'
          avatar_url?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'user' | 'viewer'
          avatar_url?: string | null
        }
      }
      customers: {
        Row: {
          id: string
          customer_code: string
          full_name: string
          email: string | null
          phone: string | null
          address: string | null
          ward: string | null
          district: string | null
          city: string
          meter_number: string | null
          status: 'active' | 'inactive' | 'suspended'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          customer_code: string
          full_name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          ward?: string | null
          district?: string | null
          city?: string
          meter_number?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          created_by?: string | null
        }
        Update: {
          customer_code?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          ward?: string | null
          district?: string | null
          city?: string
          meter_number?: string | null
          status?: 'active' | 'inactive' | 'suspended'
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          customer_id: string
          period_month: number
          period_year: number
          previous_reading: number
          current_reading: number
          consumption: number
          unit_price: number
          water_fee: number
          environmental_fee: number
          vat: number
          total_amount: number
          paid_amount: number
          remaining_amount: number
          status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          due_date: string | null
          paid_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          invoice_number: string
          customer_id: string
          period_month: number
          period_year: number
          previous_reading: number
          current_reading: number
          unit_price?: number
          environmental_fee?: number
          paid_amount?: number
          status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          invoice_number?: string
          customer_id?: string
          period_month?: number
          period_year?: number
          previous_reading?: number
          current_reading?: number
          unit_price?: number
          environmental_fee?: number
          paid_amount?: number
          status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          payment_number: string
          invoice_id: string
          customer_id: string
          amount: number
          payment_method: 'cash' | 'bank_transfer' | 'card' | 'momo' | 'zalopay'
          payment_date: string
          transaction_id: string | null
          bank_name: string | null
          reference_number: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          payment_number: string
          invoice_id: string
          customer_id: string
          amount: number
          payment_method?: 'cash' | 'bank_transfer' | 'card' | 'momo' | 'zalopay'
          payment_date?: string
          transaction_id?: string | null
          bank_name?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          payment_number?: string
          invoice_id?: string
          customer_id?: string
          amount?: number
          payment_method?: 'cash' | 'bank_transfer' | 'card' | 'momo' | 'zalopay'
          payment_date?: string
          transaction_id?: string | null
          bank_name?: string | null
          reference_number?: string | null
          notes?: string | null
        }
      }
      meter_readings: {
        Row: {
          id: string
          customer_id: string
          reading_date: string
          meter_value: number
          photo_url: string | null
          reader_name: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          customer_id: string
          reading_date: string
          meter_value: number
          photo_url?: string | null
          reader_name?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          customer_id?: string
          reading_date?: string
          meter_value?: number
          photo_url?: string | null
          reader_name?: string | null
          notes?: string | null
        }
      }
    }
    Views: {
      customer_summary: {
        Row: {
          id: string
          customer_code: string
          full_name: string
          phone: string | null
          address: string | null
          status: string
          total_invoices: number
          total_billed: number
          total_paid: number
          total_outstanding: number
        }
      }
      monthly_revenue: {
        Row: {
          period_year: number
          period_month: number
          invoice_count: number
          total_revenue: number
          collected_revenue: number
          outstanding_revenue: number
        }
      }
    }
  }
}

// Helper types
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type MeterReading = Database['public']['Tables']['meter_readings']['Row']
export type MeterReadingInsert = Database['public']['Tables']['meter_readings']['Insert']
export type MeterReadingUpdate = Database['public']['Tables']['meter_readings']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type CustomerSummary = Database['public']['Views']['customer_summary']['Row']
export type MonthlyRevenue = Database['public']['Views']['monthly_revenue']['Row']
