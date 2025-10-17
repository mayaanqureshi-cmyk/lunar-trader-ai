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
        }
        Insert: {
          buy_condition: string
          created_at?: string
          description?: string | null
          id?: string
          initial_capital?: number
          name: string
          sell_condition: string
        }
        Update: {
          buy_condition?: string
          created_at?: string
          description?: string | null
          id?: string
          initial_capital?: number
          name?: string
          sell_condition?: string
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolio"
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
