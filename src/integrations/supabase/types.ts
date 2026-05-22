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
      absentees: {
        Row: {
          absent_date: string
          created_at: string
          created_by: string | null
          department: string | null
          designation: string | null
          employee_name: string
          id: string
          remarks: string | null
          updated_at: string
        }
        Insert: {
          absent_date?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          employee_name: string
          id?: string
          remarks?: string | null
          updated_at?: string
        }
        Update: {
          absent_date?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          employee_name?: string
          id?: string
          remarks?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dpr_entries: {
        Row: {
          action_required: string | null
          activity_type: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          created_by: string | null
          department: string
          description: string
          entry_date: string
          id: string
          issues_noticed: string | null
          location: string | null
          output_evidence: string | null
          person_responsible: string | null
          priority: Database["public"]["Enums"]["dpr_priority"]
          project_name: string
          session: string | null
          status: Database["public"]["Enums"]["dpr_status"]
          updated_at: string
          vendor: string | null
        }
        Insert: {
          action_required?: string | null
          activity_type?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by?: string | null
          department: string
          description: string
          entry_date?: string
          id?: string
          issues_noticed?: string | null
          location?: string | null
          output_evidence?: string | null
          person_responsible?: string | null
          priority?: Database["public"]["Enums"]["dpr_priority"]
          project_name?: string
          session?: string | null
          status?: Database["public"]["Enums"]["dpr_status"]
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          action_required?: string | null
          activity_type?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          entry_date?: string
          id?: string
          issues_noticed?: string | null
          location?: string | null
          output_evidence?: string | null
          person_responsible?: string | null
          priority?: Database["public"]["Enums"]["dpr_priority"]
          project_name?: string
          session?: string | null
          status?: Database["public"]["Enums"]["dpr_status"]
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recorded_by: {
        Row: {
          created_at: string
          department: string | null
          designation: string | null
          dpr_date: string
          id: string
          name: string
          recorded_at: string
          role: Database["public"]["Enums"]["recorder_role"]
          signature_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          dpr_date?: string
          id?: string
          name: string
          recorded_at?: string
          role?: Database["public"]["Enums"]["recorder_role"]
          signature_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          dpr_date?: string
          id?: string
          name?: string
          recorded_at?: string
          role?: Database["public"]["Enums"]["recorder_role"]
          signature_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "project_manager"
        | "coordinator"
        | "pmc"
        | "field_engineer"
        | "viewer"
      dpr_priority: "low" | "medium" | "high" | "critical"
      dpr_status: "open" | "in_progress" | "escalated" | "resolved" | "closed"
      recorder_role: "prepared_by" | "reviewed_by" | "approved_by"
      ticket_category:
        | "rfi"
        | "worklog"
        | "drawing"
        | "hindrance"
        | "labour"
        | "machinery"
        | "grievance"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "admin",
        "project_manager",
        "coordinator",
        "pmc",
        "field_engineer",
        "viewer",
      ],
      dpr_priority: ["low", "medium", "high", "critical"],
      dpr_status: ["open", "in_progress", "escalated", "resolved", "closed"],
      recorder_role: ["prepared_by", "reviewed_by", "approved_by"],
      ticket_category: [
        "rfi",
        "worklog",
        "drawing",
        "hindrance",
        "labour",
        "machinery",
        "grievance",
      ],
    },
  },
} as const
