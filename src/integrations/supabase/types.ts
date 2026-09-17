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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      faq: {
        Row: {
          answer: string
          created_at: string
          id: string
          order_index: number
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          order_index?: number
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          order_index?: number
          question?: string
        }
        Relationships: []
      }
      qualifying_results: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          lap_time: string | null
          position: number
          race_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          lap_time?: string | null
          position: number
          race_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          lap_time?: string | null
          position?: number
          race_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualifying_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      race_events: {
        Row: {
          category: string | null
          clip_url: string | null
          created_at: string
          description: string | null
          driver: string | null
          event_type: Database["public"]["Enums"]["race_event_type"]
          id: string
          lap: number
          position: string | null
          race_id: string
        }
        Insert: {
          category?: string | null
          clip_url?: string | null
          created_at?: string
          description?: string | null
          driver?: string | null
          event_type?: Database["public"]["Enums"]["race_event_type"]
          id?: string
          lap: number
          position?: string | null
          race_id: string
        }
        Update: {
          category?: string | null
          clip_url?: string | null
          created_at?: string
          description?: string | null
          driver?: string | null
          event_type?: Database["public"]["Enums"]["race_event_type"]
          id?: string
          lap?: number
          position?: string | null
          race_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_events_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          created_at: string
          date: string
          id: string
          is_active: boolean
          name: string
          track: string
          position_finished: string | null
          category: string | null
          split: string | null
          num_cars: number | null
          num_classes: number | null
          weather: string | null
          tipo: Database["public"]["Enums"]["race_type"] | null
          drivers: string[] | null
          duration_hours: number | null
          driver_groups: Json | null
          replay_url: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          is_active?: boolean
          name: string
          track: string
          position_finished?: string | null
          category?: string | null
          split?: string | null
          num_cars?: number | null
          num_classes?: number | null
          weather?: string | null
          tipo?: Database["public"]["Enums"]["race_type"] | null
          drivers?: string[] | null
          duration_hours?: number | null
          driver_groups?: Json | null
          replay_url?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_active?: boolean
          name?: string
          track?: string
          position_finished?: string | null
          category?: string | null
          split?: string | null
          num_cars?: number | null
          num_classes?: number | null
          weather?: string | null
          tipo?: Database["public"]["Enums"]["race_type"] | null
          drivers?: string[] | null
          duration_hours?: number | null
          driver_groups?: Json | null
          replay_url?: string | null
        }
        Relationships: []
      }
      team_achievements: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          id: string
          image_url: string | null
          title: string
          race_id: string | null
          position_finished: string | null
          category: string | null
          split: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
          race_id?: string | null
          position_finished?: string | null
          category?: string | null
          split?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
          race_id?: string | null
          position_finished?: string | null
          category?: string | null
          split?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_achievements_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_positions: {
        Row: {
          id: string
          achievement_id: string
          category: string
          position_finished: string
          created_at: string
        }
        Insert: {
          id?: string
          achievement_id: string
          category: string
          position_finished: string
          created_at?: string
        }
        Update: {
          id?: string
          achievement_id?: string
          category?: string
          position_finished?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_positions_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "team_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          id: string
          storage_path: string
          url: string
          filename: string
          mime_type: string | null
          size_bytes: number | null
          description: string | null
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          storage_path: string
          url: string
          filename: string
          mime_type?: string | null
          size_bytes?: number | null
          description?: string | null
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          storage_path?: string
          url?: string
          filename?: string
          mime_type?: string | null
          size_bytes?: number | null
          description?: string | null
          category?: string | null
          created_at?: string
        }
        Relationships: []
      }
      track_info: {
        Row: {
          created_at: string
          id: string
          race_id: string
          track_map_id: string | null
          weather_description: string | null
          weather_image_id: string | null
          temperature_chart_image_id: string | null
          precip_chart_image_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          race_id: string
          track_map_id?: string | null
          weather_description?: string | null
          weather_image_id?: string | null
          temperature_chart_image_id?: string | null
          precip_chart_image_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          race_id?: string
          track_map_id?: string | null
          weather_description?: string | null
          weather_image_id?: string | null
          temperature_chart_image_id?: string | null
          precip_chart_image_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_info_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_info_weather_image_id_fkey"
            columns: ["weather_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_info_track_map_id_fkey"
            columns: ["track_map_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          id: string
          created_at: string
          name: string
          known_as: string | null
          category: string | null
          instagram: string | null
          image_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          known_as?: string | null
          category?: string | null
          instagram?: string | null
          image_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          known_as?: string | null
          category?: string | null
          instagram?: string | null
          image_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          color: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
        }
        Relationships: []
      }
      event_types: {
        Row: {
          id: string
          value: string
          label: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          value: string
          label: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          value?: string
          label?: string
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      championship_standings: {
        Row: {
          id: string
          class: string
          rank: number
          car_number: string
          car_logo_url: string | null
          country_code: string
          team_name: string
          points: number
          behind: number
          starts: number
          poles: number
          wins: number
          top5: number
          top10: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class: string
          rank: number
          car_number: string
          car_logo_url?: string | null
          country_code: string
          team_name: string
          points?: number
          behind?: number
          starts?: number
          poles?: number
          wins?: number
          top5?: number
          top10?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class?: string
          rank?: number
          car_number?: string
          car_logo_url?: string | null
          country_code?: string
          team_name?: string
          points?: number
          behind?: number
          starts?: number
          poles?: number
          wins?: number
          top5?: number
          top10?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scoreboard_live_config: {
        Row: {
          id: number
          enabled: boolean
          title: string
          intro: string | null
          updated_at: string
        }
        Insert: {
          id: number
          enabled?: boolean
          title?: string
          intro?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          enabled?: boolean
          title?: string
          intro?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scoreboard_live_lines: {
        Row: {
          id: string
          sort_order: number
          condition_label: string
          result_label: string
          result_variant: string
          visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sort_order?: number
          condition_label: string
          result_label: string
          result_variant?: string
          visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sort_order?: number
          condition_label?: string
          result_label?: string
          result_variant?: string
          visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scoreboard_live_session: {
        Row: {
          id: number
          enabled: boolean
          championship_class: string
          updated_at: string
        }
        Insert: {
          id: number
          enabled?: boolean
          championship_class?: string
          updated_at?: string
        }
        Update: {
          id?: number
          enabled?: boolean
          championship_class?: string
          updated_at?: string
        }
        Relationships: []
      }
      scoreboard_live_grid: {
        Row: {
          id: string
          class: string
          car_number: string
          sort_order: number
          team_name: string | null
          country_code: string | null
          car_logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class: string
          car_number: string
          sort_order: number
          team_name?: string | null
          country_code?: string | null
          car_logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class?: string
          car_number?: string
          sort_order?: number
          team_name?: string | null
          country_code?: string | null
          car_logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      race_event_type:
        | "race_start"
        | "pit_stop"
        | "position_change"
        | "fcy_short"
        | "fcy_long"
        | "incident"
        | "driver_change"
        | "restart"
        | "finish"
        | "qualification"
        | "other"
      race_type: "vsca" | "iracing"
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
      race_event_type: [
        "race_start",
        "pit_stop",
        "position_change",
        "fcy_short",
        "fcy_long",
        "incident",
        "driver_change",
        "restart",
        "finish",
        "qualification",
        "other",
      ],
      race_type: ["vsca", "iracing"],
    },
  },
} as const
