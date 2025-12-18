export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [];
      };
      downloads: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          row_count: number;
          selection_id: string | null;
          type: string;
          url: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          row_count?: number;
          selection_id?: string | null;
          type: string;
          url: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          row_count?: number;
          selection_id?: string | null;
          type?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'downloads_selection_id_fkey';
            columns: ['selection_id'];
            isOneToOne: false;
            referencedRelation: 'selections';
            referencedColumns: ['id'];
          }
        ];
      };
      prices: {
        Row: {
          active: boolean | null;
          currency: string | null;
          description: string | null;
          id: string;
          interval: Database['public']['Enums']['pricing_plan_interval'] | null;
          interval_count: number | null;
          metadata: Json | null;
          product_id: string | null;
          trial_period_days: number | null;
          type: Database['public']['Enums']['pricing_type'] | null;
          unit_amount: number | null;
        };
        Insert: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id: string;
          interval?: Database['public']['Enums']['pricing_plan_interval'] | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database['public']['Enums']['pricing_type'] | null;
          unit_amount?: number | null;
        };
        Update: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          interval?: Database['public']['Enums']['pricing_plan_interval'] | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database['public']['Enums']['pricing_type'] | null;
          unit_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prices_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ];
      };
      products: {
        Row: {
          active: boolean | null;
          description: string | null;
          id: string;
          image: string | null;
          metadata: Json | null;
          name: string | null;
        };
        Insert: {
          active?: boolean | null;
          description?: string | null;
          id: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Update: {
          active?: boolean | null;
          description?: string | null;
          id?: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Relationships: [];
      };
      qa_answers: {
        Row: {
          answer: string | null;
          city: string | null;
          created_at: string | null;
          doc_id: string;
          email: string | null;
          error_message: string | null;
          id: string;
          name: string | null;
          session_id: string;
          status: string;
        };
        Insert: {
          answer?: string | null;
          city?: string | null;
          created_at?: string | null;
          doc_id: string;
          email?: string | null;
          error_message?: string | null;
          id?: string;
          name?: string | null;
          session_id: string;
          status?: string;
        };
        Update: {
          answer?: string | null;
          city?: string | null;
          created_at?: string | null;
          doc_id?: string;
          email?: string | null;
          error_message?: string | null;
          id?: string;
          name?: string | null;
          session_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'qa_answers_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'qa_sessions';
            referencedColumns: ['id'];
          }
        ];
      };
      qa_sessions: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          csv_url: string | null;
          error_message: string | null;
          id: string;
          progress: number | null;
          prompt: string;
          selection_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          csv_url?: string | null;
          error_message?: string | null;
          id?: string;
          progress?: number | null;
          prompt: string;
          selection_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          csv_url?: string | null;
          error_message?: string | null;
          id?: string;
          progress?: number | null;
          prompt?: string;
          selection_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'qa_sessions_selection_id_fkey';
            columns: ['selection_id'];
            isOneToOne: false;
            referencedRelation: 'selections';
            referencedColumns: ['id'];
          }
        ];
      };
      selection_items: {
        Row: {
          city: string | null;
          created_at: string;
          doc_id: string;
          email: string | null;
          experience_years: number | null;
          id: string;
          name: string | null;
          phone: string | null;
          sectors: Json | null;
          selection_id: string;
          similarity: number | null;
          street: string | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          doc_id: string;
          email?: string | null;
          experience_years?: number | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          sectors?: Json | null;
          selection_id: string;
          similarity?: number | null;
          street?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          doc_id?: string;
          email?: string | null;
          experience_years?: number | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          sectors?: Json | null;
          selection_id?: string;
          similarity?: number | null;
          street?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'selection_items_selection_id_fkey';
            columns: ['selection_id'];
            isOneToOne: false;
            referencedRelation: 'selections';
            referencedColumns: ['id'];
          }
        ];
      };
      selections: {
        Row: {
          created_at: string;
          criteria_json: Json;
          expires_at: string;
          id: string;
          item_count: number;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          criteria_json: Json;
          expires_at?: string;
          id?: string;
          item_count?: number;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          criteria_json?: Json;
          expires_at?: string;
          id?: string;
          item_count?: number;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          created: string;
          current_period_end: string;
          current_period_start: string;
          ended_at: string | null;
          id: string;
          metadata: Json | null;
          price_id: string | null;
          quantity: number | null;
          status: Database['public']['Enums']['subscription_status'] | null;
          trial_end: string | null;
          trial_start: string | null;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: Database['public']['Enums']['subscription_status'] | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id?: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: Database['public']['Enums']['subscription_status'] | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_price_id_fkey';
            columns: ['price_id'];
            isOneToOne: false;
            referencedRelation: 'prices';
            referencedColumns: ['id'];
          }
        ];
      };
      usage_log: {
        Row: {
          action: string;
          count: number;
          created_at: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          count: number;
          created_at?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          count?: number;
          created_at?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          billing_address: Json | null;
          full_name: string | null;
          id: string;
          payment_method: Json | null;
          email_notifications_enabled: boolean;
        };
        Insert: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          full_name?: string | null;
          id: string;
          payment_method?: Json | null;
          email_notifications_enabled?: boolean;
        };
        Update: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          full_name?: string | null;
          id?: string;
          payment_method?: Json | null;
          email_notifications_enabled?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_usage_limit: {
        Args: {
          p_action: string;
          p_count: number;
          p_limit: number;
          p_user_id: string;
        };
        Returns: boolean;
      };
      create_selection: {
        Args: { p_criteria_json: Json; p_items: Json; p_name: string };
        Returns: string;
      };
      delete_selection: { Args: { p_selection_id: string }; Returns: undefined };
      get_usage_stats: { Args: { p_user_id: string }; Returns: Json };
      list_selections: {
        Args: never;
        Returns: {
          created_at: string;
          criteria_json: Json;
          expires_at: string;
          id: string;
          item_count: number;
          name: string;
        }[];
      };
    };
    Enums: {
      pricing_plan_interval: 'day' | 'week' | 'month' | 'year';
      pricing_type: 'one_time' | 'recurring';
      subscription_status:
        | 'trialing'
        | 'active'
        | 'canceled'
        | 'incomplete'
        | 'incomplete_expired'
        | 'past_due'
        | 'unpaid'
        | 'paused';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
  ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      pricing_plan_interval: ['day', 'week', 'month', 'year'],
      pricing_type: ['one_time', 'recurring'],
      subscription_status: [
        'trialing',
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'unpaid',
        'paused',
      ],
    },
  },
} as const;
