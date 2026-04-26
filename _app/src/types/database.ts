// Tipos gerados automaticamente do schema Supabase via:
//   pnpm supabase:types
// Não editar à mão.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      lojas: {
        Row: {
          ativa: boolean
          cota_try_on_mensal: number
          created_at: string
          exibir_preco_publico: boolean
          id: string
          instagram: string | null
          logo_storage_path: string | null
          nome: string
          owner_user_id: string
          slug: string
          tiktok: string | null
          updated_at: string
          whatsapp_e164: string | null
        }
        Insert: {
          ativa?: boolean
          cota_try_on_mensal?: number
          created_at?: string
          exibir_preco_publico?: boolean
          id?: string
          instagram?: string | null
          logo_storage_path?: string | null
          nome: string
          owner_user_id: string
          slug: string
          tiktok?: string | null
          updated_at?: string
          whatsapp_e164?: string | null
        }
        Update: {
          ativa?: boolean
          cota_try_on_mensal?: number
          created_at?: string
          exibir_preco_publico?: boolean
          id?: string
          instagram?: string | null
          logo_storage_path?: string | null
          nome?: string
          owner_user_id?: string
          slug?: string
          tiktok?: string | null
          updated_at?: string
          whatsapp_e164?: string | null
        }
        Relationships: []
      }
      pecas: {
        Row: {
          created_at: string
          foto_principal_id: string | null
          id: string
          loja_id: string
          nome: string
          preco_centavos: number | null
          status: Database['public']['Enums']['peca_status']
          tamanho: string | null
          updated_at: string
          vendida_em: string | null
        }
        Insert: {
          created_at?: string
          foto_principal_id?: string | null
          id?: string
          loja_id: string
          nome: string
          preco_centavos?: number | null
          status?: Database['public']['Enums']['peca_status']
          tamanho?: string | null
          updated_at?: string
          vendida_em?: string | null
        }
        Update: {
          created_at?: string
          foto_principal_id?: string | null
          id?: string
          loja_id?: string
          nome?: string
          preco_centavos?: number | null
          status?: Database['public']['Enums']['peca_status']
          tamanho?: string | null
          updated_at?: string
          vendida_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pecas_foto_principal_fk'
            columns: ['foto_principal_id']
            isOneToOne: false
            referencedRelation: 'pecas_fotos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pecas_loja_id_fkey'
            columns: ['loja_id']
            isOneToOne: false
            referencedRelation: 'lojas'
            referencedColumns: ['id']
          },
        ]
      }
      pecas_fotos: {
        Row: {
          created_at: string
          id: string
          ordem: number
          peca_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          peca_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          peca_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pecas_fotos_peca_id_fkey'
            columns: ['peca_id']
            isOneToOne: false
            referencedRelation: 'pecas'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome_completo: string | null
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nome_completo?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_completo?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      try_on_uses: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          ip_hash: string
          loja_id: string
          peca_id: string
          provider: Database['public']['Enums']['try_on_provider'] | null
          provider_request_id: string | null
          session_id: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          ip_hash: string
          loja_id: string
          peca_id: string
          provider?: Database['public']['Enums']['try_on_provider'] | null
          provider_request_id?: string | null
          session_id?: string | null
          success: boolean
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          ip_hash?: string
          loja_id?: string
          peca_id?: string
          provider?: Database['public']['Enums']['try_on_provider'] | null
          provider_request_id?: string | null
          session_id?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'try_on_uses_loja_id_fkey'
            columns: ['loja_id']
            isOneToOne: false
            referencedRelation: 'lojas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'try_on_uses_peca_id_fkey'
            columns: ['peca_id']
            isOneToOne: false
            referencedRelation: 'pecas'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_user_loja_id: { Args: never; Returns: string }
      get_peca_publica: {
        Args: { p_peca_id: string; p_slug: string }
        Returns: {
          fotos: Json
          nome: string
          peca_id: string
          preco_centavos: number
          tamanho: string
        }[]
      }
      get_pecas_publicas: {
        Args: { p_slug: string }
        Returns: {
          created_at: string
          foto_principal_path: string
          fotos_count: number
          nome: string
          peca_id: string
          preco_centavos: number
          tamanho: string
        }[]
      }
      get_vitrine_publica: {
        Args: { p_slug: string }
        Returns: {
          exibir_preco_publico: boolean
          instagram: string
          logo_storage_path: string
          loja_id: string
          nome: string
          slug: string
          tiktok: string
          whatsapp_e164: string
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      try_on_uso_mes_atual: { Args: { p_loja_id: string }; Returns: number }
    }
    Enums: {
      peca_status: 'disponivel' | 'vendida'
      try_on_provider: 'fashn' | 'replicate'
      user_role: 'lojista' | 'super_admin'
    }
    CompositeTypes: { [_ in never]: never }
  }
}
