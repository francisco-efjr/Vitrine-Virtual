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
          ai_image_model: 'high' | 'medium'
          ativa: boolean
          cota_try_on_mensal: number
          created_at: string
          exibir_preco_publico: boolean
          id: string
          instagram: string | null
          logo_storage_path: string | null
          nome: string
          owner_user_id: string
          provador_fundo_storage_path: string | null
          provador_fundo_tipo: 'branco' | 'personalizado' | 'cliente'
          slug: string
          tagline: string | null
          tiktok: string | null
          updated_at: string
          vitrine_publica_visivel: boolean
          vitrine_theme: 'default' | 'CasaGabyHarb'
          hero_image_storage_path: string | null
          whatsapp_e164: string | null
        }
        Insert: {
          ai_image_model?: 'high' | 'medium'
          ativa?: boolean
          cota_try_on_mensal?: number
          created_at?: string
          exibir_preco_publico?: boolean
          id?: string
          instagram?: string | null
          logo_storage_path?: string | null
          nome: string
          owner_user_id: string
          provador_fundo_storage_path?: string | null
          provador_fundo_tipo?: 'branco' | 'personalizado' | 'cliente'
          slug: string
          tagline?: string | null
          tiktok?: string | null
          updated_at?: string
          vitrine_publica_visivel?: boolean
          vitrine_theme?: 'default' | 'CasaGabyHarb'
          hero_image_storage_path?: string | null
          whatsapp_e164?: string | null
        }
        Update: {
          ai_image_model?: 'high' | 'medium'
          ativa?: boolean
          cota_try_on_mensal?: number
          created_at?: string
          exibir_preco_publico?: boolean
          id?: string
          instagram?: string | null
          logo_storage_path?: string | null
          nome?: string
          owner_user_id?: string
          provador_fundo_storage_path?: string | null
          provador_fundo_tipo?: 'branco' | 'personalizado' | 'cliente'
          slug?: string
          tagline?: string | null
          tiktok?: string | null
          updated_at?: string
          vitrine_publica_visivel?: boolean
          vitrine_theme?: 'default' | 'CasaGabyHarb'
          hero_image_storage_path?: string | null
          whatsapp_e164?: string | null
        }
        Relationships: []
      }
      contact_clicks: {
        Row: {
          channel: 'instagram' | 'tiktok' | 'whatsapp'
          created_at: string
          device_type: string | null
          id: string
          ip_hash: string | null
          loja_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          channel: 'instagram' | 'tiktok' | 'whatsapp'
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          loja_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          channel?: 'instagram' | 'tiktok' | 'whatsapp'
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          loja_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      try_on_generations: {
        Row: {
          ai_image_model: 'high' | 'medium' | null
          created_at: string
          customer_photo_path: string | null
          duration_ms: number | null
          error_code: string | null
          feedback_at: string | null
          feedback_comentario: string | null
          feedback_positivo: boolean | null
          feedback_reason: string | null
          final_prompt: string | null
          gate_reason: string | null
          gate_signals: Json | null
          gate_verdict: 'proceed' | 'proceed_with_warning' | 'reject' | null
          generation_params: Json | null
          id: string
          ip_hash: string | null
          loja_id: string
          model_resolved: string | null
          peca_id: string | null
          product_image_path: string | null
          provider: Database['public']['Enums']['try_on_provider'] | null
          provider_request_id: string | null
          result_bucket: string | null
          result_path: string | null
          session_id: string | null
          status: 'success' | 'error' | 'fallback'
          tier_chosen: 'tier_a_premium' | 'tier_b_economy' | 'tier_c_gemini' | 'tier_s_vertex' | null
          tier_effective: 'tier_a_premium' | 'tier_b_economy' | 'tier_c_gemini' | 'tier_s_vertex' | null
          user_id: string | null
        }
        Insert: {
          ai_image_model?: 'high' | 'medium' | null
          created_at?: string
          customer_photo_path?: string | null
          duration_ms?: number | null
          error_code?: string | null
          feedback_at?: string | null
          feedback_comentario?: string | null
          feedback_positivo?: boolean | null
          feedback_reason?: string | null
          final_prompt?: string | null
          gate_reason?: string | null
          gate_signals?: Json | null
          gate_verdict?: 'proceed' | 'proceed_with_warning' | 'reject' | null
          generation_params?: Json | null
          id?: string
          ip_hash?: string | null
          loja_id: string
          model_resolved?: string | null
          peca_id?: string | null
          product_image_path?: string | null
          provider?: Database['public']['Enums']['try_on_provider'] | null
          provider_request_id?: string | null
          result_bucket?: string | null
          result_path?: string | null
          session_id?: string | null
          status?: 'success' | 'error' | 'fallback'
          tier_chosen?: 'tier_a_premium' | 'tier_b_economy' | 'tier_c_gemini' | 'tier_s_vertex' | null
          tier_effective?: 'tier_a_premium' | 'tier_b_economy' | 'tier_c_gemini' | 'tier_s_vertex' | null
          user_id?: string | null
        }
        Update: {
          ai_image_model?: 'high' | 'medium' | null
          created_at?: string
          customer_photo_path?: string | null
          duration_ms?: number | null
          error_code?: string | null
          feedback_at?: string | null
          feedback_comentario?: string | null
          feedback_positivo?: boolean | null
          feedback_reason?: string | null
          final_prompt?: string | null
          gate_reason?: string | null
          gate_signals?: Json | null
          gate_verdict?: 'proceed' | 'proceed_with_warning' | 'reject' | null
          generation_params?: Json | null
          id?: string
          ip_hash?: string | null
          loja_id?: string
          model_resolved?: string | null
          peca_id?: string | null
          product_image_path?: string | null
          provider?: Database['public']['Enums']['try_on_provider'] | null
          provider_request_id?: string | null
          result_bucket?: string | null
          result_path?: string | null
          session_id?: string | null
          status?: 'success' | 'error' | 'fallback'
          tier_chosen?: 'tier_a_premium' | 'tier_b_economy' | 'tier_c_gemini' | 'tier_s_vertex' | null
          tier_effective?: 'tier_a_premium' | 'tier_b_economy' | 'tier_c_gemini' | 'tier_s_vertex' | null
          user_id?: string | null
        }
        Relationships: []
      }
      pecas: {
        Row: {
          categoria_id: string | null
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
          categoria_id?: string | null
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
          categoria_id?: string | null
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
    Views: {
      try_on_quality_summary: {
        Row: {
          provider: string
          model_resolved: string
          tier_effective: string
          total: number
          with_feedback: number
          positive: number
          negative: number
          approval_rate_pct: number | null
          avg_duration_s: number | null
          errors: number
          first_seen: string | null
          last_seen: string | null
        }
        Relationships: []
      }
      try_on_feedback_reasons: {
        Row: {
          reason: string
          count: number
          pct_of_negative: number | null
        }
        Relationships: []
      }
      try_on_gate_effectiveness: {
        Row: {
          gate_verdict: string
          total_with_feedback: number
          positive: number
          negative: number
          approval_rate_pct: number | null
        }
        Relationships: []
      }
      try_on_acceptance_vs_feedback: {
        Row: {
          check_name: string
          passed: boolean
          total: number
          user_positive: number
          user_negative: number
          approval_rate_pct: number | null
        }
        Relationships: []
      }
    }
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
          tagline: string
          tiktok: string
          vitrine_theme: 'default' | 'CasaGabyHarb'
          hero_image_storage_path: string | null
          whatsapp_e164: string
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      try_on_uso_mes_atual: { Args: { p_loja_id: string }; Returns: number }
    }
    Enums: {
      peca_status: 'disponivel' | 'vendida'
      try_on_provider: 'fashn' | 'replicate' | 'google' | 'openai'
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
export type ContactClickRow = Tables<'contact_clicks'>
export type TryOnGenerationRow = Tables<'try_on_generations'>
export type AiImageModel = 'high' | 'medium'
export type ContactChannel = 'instagram' | 'tiktok' | 'whatsapp'
export type VitrineTheme = 'default' | 'CasaGabyHarb'
export const VITRINE_THEMES = ['default', 'CasaGabyHarb'] as const
