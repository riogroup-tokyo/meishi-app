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
      business_cards: {
        Row: {
          id: string
          user_id: string
          image_url: string | null
          company_name: string | null
          department: string | null
          position: string | null
          person_name: string
          person_name_kana: string | null
          email: string | null
          phone: string | null
          mobile_phone: string | null
          postal_code: string | null
          address: string | null
          website: string | null
          memo: string | null
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url?: string | null
          company_name?: string | null
          department?: string | null
          position?: string | null
          person_name: string
          person_name_kana?: string | null
          email?: string | null
          phone?: string | null
          mobile_phone?: string | null
          postal_code?: string | null
          address?: string | null
          website?: string | null
          memo?: string | null
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string | null
          company_name?: string | null
          department?: string | null
          position?: string | null
          person_name?: string
          person_name_kana?: string | null
          email?: string | null
          phone?: string | null
          mobile_phone?: string | null
          postal_code?: string | null
          address?: string | null
          website?: string | null
          memo?: string | null
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      card_tags: {
        Row: {
          id: string
          card_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          card_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      card_relations: {
        Row: {
          id: string
          card_id: string
          related_card_id: string
          relation_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          card_id: string
          related_card_id: string
          relation_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          related_card_id?: string
          relation_type?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          created_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          card_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
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

// Convenience type aliases
export type BusinessCard = Database['public']['Tables']['business_cards']['Row']
export type BusinessCardInsert = Database['public']['Tables']['business_cards']['Insert']
export type BusinessCardUpdate = Database['public']['Tables']['business_cards']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

export type CardTag = Database['public']['Tables']['card_tags']['Row']
export type CardTagInsert = Database['public']['Tables']['card_tags']['Insert']

export type CardRelation = Database['public']['Tables']['card_relations']['Row']
export type CardRelationInsert = Database['public']['Tables']['card_relations']['Insert']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']

export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']
export type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update']
