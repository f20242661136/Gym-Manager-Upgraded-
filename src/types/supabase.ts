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
      gyms: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          phone: string | null
          email: string | null
          address: string | null
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      gym_users: {
        Row: {
          id: string
          gym_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'staff' | 'trainer' | 'receptionist'
          status: 'active' | 'pending' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'manager' | 'staff' | 'trainer' | 'receptionist'
          status?: 'active' | 'pending' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'manager' | 'staff' | 'trainer' | 'receptionist'
          status?: 'active' | 'pending' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          gym_id: string
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
          gym_id: string
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
          gym_id?: string
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
          gym_id: string
          created_at: string
          client_id: string
          client_name: string
          amount: number
          payment_date: string
          due_date: string
          status: 'Paid' | 'Pending'
          duration: number
        }
        Insert: {
          id?: string
          gym_id: string
          created_at?: string
          client_id: string
          client_name: string
          amount: number
          payment_date: string
          due_date: string
          status?: 'Paid' | 'Pending'
          duration?: number
        }
        Update: {
          id?: string
          gym_id?: string
          created_at?: string
          client_id?: string
          client_name?: string
          amount?: number
          payment_date?: string
          due_date?: string
          status?: 'Paid' | 'Pending'
          duration?: number
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