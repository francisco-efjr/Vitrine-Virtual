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
          vendida_em?: string | null
        }
        Relationships: []
      }
      pecas_fotos: {
        Row: {
          id: string
          ordem: number
          peca_id: string
          storage_path: string
        }
        Insert: {
          id?: string
          ordem: number
          peca_id: string
          storage_path: string
        }
        Update: {
          id?: string
          ordem?: number
          peca_id?: string
          storage_path?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome_completo: string | null
          updated_at: string
          role: Database['public']['Enums']['user_role']
        }
        Insert: {
          created_at?: string
          id: string
          nome_completo?: string | null
          updated_at?: string
          role?: Database['public']['Enums']['user_role']
        }
        Update: {
          created_at?: string
          id?: string
          nome_completo?: string | null
          updated_at?: string
          role?: Database['public']['Enums']['user_role']
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
        Relationships: []
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
      try_on_provider: 'fashn' | 'replicate' | 'google'
      user_role: 'lojista' | 'super_admin'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enum<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

export type LojaRow = Tables<'lojas'>
export type PecaRow = Tables<'pecas'>
export type PecaFotoRow = Tables<'pecas_fotos'>
export type ProfilesRow = Tables<'profiles'>
