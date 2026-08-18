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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent_name: string
          created_at: string
          duration_ms: number
          error_message: string | null
          finished_at: string
          id: string
          input_summary: string | null
          model: string | null
          output_summary: string | null
          session_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          duration_ms: number
          error_message?: string | null
          finished_at: string
          id?: string
          input_summary?: string | null
          model?: string | null
          output_summary?: string | null
          session_id?: string | null
          started_at: string
          status: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          finished_at?: string
          id?: string
          input_summary?: string | null
          model?: string | null
          output_summary?: string | null
          session_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_evaluations: {
        Row: {
          answer_id: string
          created_at: string
          evaluation: Json
          id: string
          scores: Json
          session_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          evaluation: Json
          id?: string
          scores: Json
          session_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          evaluation?: Json
          id?: string
          scores?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_evaluations_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: true
            referencedRelation: "candidate_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_answers: {
        Row: {
          answer_text: string
          id: string
          question_id: string
          session_id: string
          submitted_at: string
        }
        Insert: {
          answer_text: string
          id?: string
          question_id: string
          session_id: string
          submitted_at?: string
        }
        Update: {
          answer_text?: string
          id?: string
          question_id?: string
          session_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          headline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          headline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          headline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coaching_feedback: {
        Row: {
          answer_id: string
          created_at: string
          feedback: Json
          id: string
          session_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          feedback: Json
          id?: string
          session_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          feedback?: Json
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_feedback_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: true
            referencedRelation: "candidate_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          created_at: string
          id: string
          normalized_company: string
          normalized_role: string | null
          research: Json
          researched_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_company: string
          normalized_role?: string | null
          research: Json
          researched_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_company?: string
          normalized_role?: string | null
          research?: Json
          researched_at?: string
        }
        Relationships: []
      }
      final_reports: {
        Row: {
          created_at: string
          id: string
          overall_score: number
          readiness_level: string
          report: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          overall_score: number
          readiness_level: string
          report: Json
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          overall_score?: number
          readiness_level?: string
          report?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_plans: {
        Row: {
          created_at: string
          id: string
          plan: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan: Json
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          category: string
          competencies_tested: string[]
          created_at: string
          difficulty: string
          id: string
          is_follow_up: boolean
          parent_question_id: string | null
          reason_for_asking: string | null
          sequence_index: number
          session_id: string
          status: string
          text: string
        }
        Insert: {
          category: string
          competencies_tested?: string[]
          created_at?: string
          difficulty: string
          id?: string
          is_follow_up?: boolean
          parent_question_id?: string | null
          reason_for_asking?: string | null
          sequence_index: number
          session_id: string
          status?: string
          text: string
        }
        Update: {
          category?: string
          competencies_tested?: string[]
          created_at?: string
          difficulty?: string
          id?: string
          is_follow_up?: boolean
          parent_question_id?: string | null
          reason_for_asking?: string | null
          sequence_index?: number
          session_id?: string
          status?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          created_at: string
          current_question_index: number
          difficulty: string
          failure_reason: string | null
          id: string
          interview_mode: string
          max_follow_ups_per_question: number
          max_questions: number
          research_enabled: boolean
          seniority: string | null
          status: Database["public"]["Enums"]["session_status"]
          target_company: string | null
          target_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_question_index?: number
          difficulty?: string
          failure_reason?: string | null
          id?: string
          interview_mode?: string
          max_follow_ups_per_question?: number
          max_questions?: number
          research_enabled?: boolean
          seniority?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          target_company?: string | null
          target_role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_question_index?: number
          difficulty?: string
          failure_reason?: string | null
          id?: string
          interview_mode?: string
          max_follow_ups_per_question?: number
          max_questions?: number
          research_enabled?: boolean
          seniority?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          target_company?: string | null
          target_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_descriptions: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          content_hash: string
          created_at: string
          id: string
          raw_text: string
          session_id: string
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          content_hash: string
          created_at?: string
          id?: string
          raw_text: string
          session_id: string
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          content_hash?: string
          created_at?: string
          id?: string
          raw_text?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_descriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_documents: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          content_hash: string
          created_at: string
          id: string
          raw_text: string
          session_id: string
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          content_hash: string
          created_at?: string
          id?: string
          raw_text: string
          session_id: string
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          content_hash?: string
          created_at?: string
          id?: string
          raw_text?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_matches: {
        Row: {
          created_at: string
          id: string
          job_description_id: string
          match: Json
          resume_document_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_description_id: string
          match: Json
          resume_document_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_description_id?: string
          match?: Json
          resume_document_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_matches_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_descriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_matches_resume_document_id_fkey"
            columns: ["resume_document_id"]
            isOneToOne: false
            referencedRelation: "resume_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      session_status:
        | "draft"
        | "preparing"
        | "ready"
        | "in_progress"
        | "paused"
        | "completed"
        | "failed"
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
      session_status: [
        "draft",
        "preparing",
        "ready",
        "in_progress",
        "paused",
        "completed",
        "failed",
      ],
    },
  },
} as const
