export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          created_at: string
          name: string
          phone: string
          email: string
          age: number
          gender: string
          weight: number
          height: number
          chest: number
          waist: number
          bmi: number
          photo_url: string
          membership_status: 'Paid' | 'Unpaid'
          registration_date: string
          membership_due_date: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          phone: string
          email: string
          age?: number
          gender?: string
          weight?: number
          height?: number
          chest?: number
          waist?: number
          bmi?: number
          photo_url?: string
          membership_status?: 'Paid' | 'Unpaid'
          registration_date?: string
          membership_due_date?: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          phone?: string
          email?: string
          age?: number
          gender?: string
          weight?: number
          height?: number
          chest?: number
          waist?: number
          bmi?: number
          photo_url?: string
          membership_status?: 'Paid' | 'Unpaid'
          registration_date?: string
          membership_due_date?: string
        }
      }
      payments: {
        Row: {
          id: string
          created_at: string
          client_id: string
          client_name: string
          amount: number
          payment_date: string
          due_date: string
          status: 'Paid' | 'Pending'
        }
        Insert: {
          id?: string
          created_at?: string
          client_id: string
          client_name: string
          amount: number
          payment_date: string
          due_date: string
          status?: 'Paid' | 'Pending'
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string
          client_name?: string
          amount?: number
          payment_date?: string
          due_date?: string
          status?: 'Paid' | 'Pending'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}