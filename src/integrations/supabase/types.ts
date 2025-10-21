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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      auto_trade_logs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          recommendations: number | null
          scanned: number | null
          trades_data: Json | null
          trades_executed: number | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          recommendations?: number | null
          scanned?: number | null
          trades_data?: Json | null
          trades_executed?: number | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          recommendations?: number | null
          scanned?: number | null
          trades_data?: Json | null
          trades_executed?: number | null
        }
        Relationships: []
      }
      backtest_results: {
        Row: {
          created_at: string
          end_date: string
          id: string
          losing_trades: number
          max_drawdown: number
          return_percentage: number
          sharpe_ratio: number | null
          start_date: string
          strategy_id: string
          symbol: string
          total_profit_loss: number
          total_trades: number
          user_id: string | null
          win_rate: number
          winning_trades: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          losing_trades: number
          max_drawdown: number
          return_percentage: number
          sharpe_ratio?: number | null
          start_date: string
          strategy_id: string
          symbol: string
          total_profit_loss: number
          total_trades: number
          user_id?: string | null
          win_rate: number
          winning_trades: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          losing_trades?: number
          max_drawdown?: number
          return_percentage?: number
          sharpe_ratio?: number | null
          start_date?: string
          strategy_id?: string
          symbol?: string
          total_profit_loss?: number
          total_trades?: number
          user_id?: string | null
          win_rate?: number
          winning_trades?: number
        }
        Relationships: [
          {
            foreignKeyName: "backtest_results_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "backtest_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtest_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backtest_strategies: {
        Row: {
          buy_condition: string
          created_at: string
          description: string | null
          id: string
          initial_capital: number
          name: string
          sell_condition: string
          user_id: string | null
        }
        Insert: {
          buy_condition: string
          created_at?: string
          description?: string | null
          id?: string
          initial_capital?: number
          name: string
          sell_condition: string
          user_id?: string | null
        }
        Update: {
          buy_condition?: string
          created_at?: string
          description?: string | null
          id?: string
          initial_capital?: number
          name?: string
          sell_condition?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backtest_strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_portfolio: {
        Row: {
          created_at: string
          id: string
          name: string
          purchase_date: string
          purchase_price: number
          quantity: number
          symbol: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          purchase_date?: string
          purchase_price: number
          quantity: number
          symbol: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_portfolio_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_trades: {
        Row: {
          action: string
          created_at: string
          id: string
          price: number
          profit_loss: number | null
          quantity: number
          symbol: string
          total_value: number
          trade_date: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          price: number
          profit_loss?: number | null
          quantity: number
          symbol: string
          total_value: number
          trade_date?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          price?: number
          profit_loss?: number | null
          quantity?: number
          symbol?: string
          total_value?: number
          trade_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio: {
        Row: {
          created_at: string
          id: string
          name: string
          purchase_date: string
          purchase_price: number
          quantity: number
          symbol: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          purchase_date?: string
          purchase_price: number
          quantity: number
          symbol: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_audit_log: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          order_id: string | null
          order_type: string | null
          price: number | null
          quantity: number
          status: string
          symbol: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          order_id?: string | null
          order_type?: string | null
          price?: number | null
          quantity: number
          status: string
          symbol: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          order_id?: string | null
          order_type?: string | null
          price?: number | null
          quantity?: number
          status?: string
          symbol?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_signals: {
        Row: {
          created_at: string
          current_gain_percent: number | null
          current_price: number
          id: string
          is_read: boolean | null
          message: string
          portfolio_id: string | null
          price_change_percent: number
          signal_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_gain_percent?: number | null
          current_price: number
          id?: string
          is_read?: boolean | null
          message: string
          portfolio_id?: string | null
          price_change_percent: number
          signal_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_gain_percent?: number | null
          current_price?: number
          id?: string
          is_read?: boolean | null
          message?: string
          portfolio_id?: string | null
          price_change_percent?: number
          signal_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "premium" | "user"
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
      app_role: ["admin", "premium", "user"],
    },
  },
} as const
