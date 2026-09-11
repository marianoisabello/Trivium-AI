export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          assets: Json
          created_at: string
          created_by: string | null
          current_situation: string | null
          id: string
          name: string
          organization_id: string
          status: string
          variables: Json
        }
        Insert: {
          assets?: Json
          created_at?: string
          created_by?: string | null
          current_situation?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          variables?: Json
        }
        Update: {
          assets?: Json
          created_at?: string
          created_by?: string | null
          current_situation?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          consumption: Json
          created_at: string
          email: string | null
          id: string
          linkedin: string | null
          name: string
          organization_id: string
          segment: string | null
          whatsapp: string | null
        }
        Insert: {
          consumption?: Json
          created_at?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name: string
          organization_id: string
          segment?: string | null
          whatsapp?: string | null
        }
        Update: {
          consumption?: Json
          created_at?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name?: string
          organization_id?: string
          segment?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          organization_id: string
          plan: Json
          scopes: string[]
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          organization_id: string
          plan?: Json
          scopes?: string[]
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          organization_id?: string
          plan?: Json
          scopes?: string[]
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_measurements: {
        Row: {
          created_at: string
          id: string
          kpi_id: string
          measured_at: string
          note: string | null
          organization_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_id: string
          measured_at?: string
          note?: string | null
          organization_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          kpi_id?: string
          measured_at?: string
          note?: string | null
          organization_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_measurements_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_measurements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          created_at: string
          current_value: number
          id: string
          initiative_id: string
          name: string
          organization_id: string
          target_value: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          initiative_id: string
          name: string
          organization_id: string
          target_value?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          initiative_id?: string
          name?: string
          organization_id?: string
          target_value?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_resources: {
        Row: {
          capacities: string | null
          created_at: string
          id: string
          materials: string | null
          organization_id: string
          waste: string | null
          workforce: string | null
        }
        Insert: {
          capacities?: string | null
          created_at?: string
          id?: string
          materials?: string | null
          organization_id: string
          waste?: string | null
          workforce?: string | null
        }
        Update: {
          capacities?: string | null
          created_at?: string
          id?: string
          materials?: string | null
          organization_id?: string
          waste?: string | null
          workforce?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          onboarding_completed: boolean
          size: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          onboarding_completed?: boolean
          size?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          onboarding_completed?: boolean
          size?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          channel: string
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          schedule: string
          status: string
          target_client: string | null
          template: string | null
        }
        Insert: {
          channel?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          schedule?: string
          status?: string
          target_client?: string | null
          template?: string | null
        }
        Update: {
          channel?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          schedule?: string
          status?: string
          target_client?: string | null
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          analysis_id: string
          created_at: string
          drivers: Json
          expected_return: number
          id: string
          narrative: string | null
          organization_id: string
          probability: number
          risk: string
          type: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          drivers?: Json
          expected_return?: number
          id?: string
          narrative?: string | null
          organization_id: string
          probability?: number
          risk?: string
          type: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          drivers?: Json
          expected_return?: number
          id?: string
          narrative?: string | null
          organization_id?: string
          probability?: number
          risk?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: { _industry?: string; _name: string; _size?: string }
        Returns: string
      }
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cliente"],
    },
  },
} as const
