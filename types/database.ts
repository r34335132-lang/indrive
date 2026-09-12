export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          first_name: string;
          phone: string;
          city: string;
          initials: string;
          rating: number;
          total_trips: number;
          member_since: string;
          bio: string | null;
          roles: ('passenger' | 'driver' | 'admin')[];
          active_role: 'passenger' | 'driver' | 'admin';
          vehicle_make: string | null;
          vehicle_model: string | null;
          vehicle_color: string | null;
          vehicle_plate: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          email: string;
          name: string;
          first_name: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      driver_documents: {
        Row: {
          user_id: string;
          ine_front: boolean;
          ine_back: boolean;
          license: boolean;
          circulation: boolean;
          insurance: boolean;
          complete: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          ine_front?: boolean;
          ine_back?: boolean;
          license?: boolean;
          circulation?: boolean;
          insurance?: boolean;
        };
        Update: Partial<Database['public']['Tables']['driver_documents']['Insert']>;
      };
      tariffs: {
        Row: {
          id: string;
          active: boolean;
          per_km_total: number;
          per_km_driver: number;
          per_km_app: number;
          min_distance_km: number;
          min_fare: number;
          airport_toll_total: number;
          airport_toll_driver: number;
          airport_toll_app: number;
          high_demand_active: boolean;
          surge_multiplier: number;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tariffs']['Row']>;
        Update: Partial<Database['public']['Tables']['tariffs']['Row']>;
      };
      rides: {
        Row: {
          id: string;
          passenger_id: string;
          driver_id: string | null;
          status:
            | 'searching'
            | 'offered'
            | 'accepted'
            | 'en_route_pickup'
            | 'arrived_pickup'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
          origin: string;
          destination: string;
          origin_lat: number;
          origin_lng: number;
          destination_lat: number;
          destination_lng: number;
          vehicle: 'Económico' | 'Comfort' | 'Premium' | 'Van';
          price: number;
          driver_net: number;
          app_net: number;
          airport_toll: number;
          distance_km: number;
          duration_label: string;
          passenger_name: string;
          passenger_rating: number;
          driver_name: string | null;
          driver_rating: number | null;
          driver_car: string | null;
          driver_plate: string | null;
          rating: number | null;
          comment: string | null;
          scheduled_date: string | null;
          scheduled_time: string | null;
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          passenger_id: string;
          origin: string;
          destination: string;
          origin_lat: number;
          origin_lng: number;
          destination_lat: number;
          destination_lng: number;
          status?: Database['public']['Tables']['rides']['Row']['status'];
          vehicle?: Database['public']['Tables']['rides']['Row']['vehicle'];
          price?: number;
          driver_net?: number;
          app_net?: number;
          airport_toll?: number;
          distance_km?: number;
          duration_label?: string;
          passenger_name?: string;
          passenger_rating?: number;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
        };
        Update: Partial<Database['public']['Tables']['rides']['Row']>;
      };
      ride_locations: {
        Row: {
          ride_id: string;
          lat: number;
          lng: number;
          heading: number;
          updated_at: string;
        };
        Insert: {
          ride_id: string;
          lat: number;
          lng: number;
          heading?: number;
        };
        Update: Partial<Database['public']['Tables']['ride_locations']['Insert']>;
      };
    };
  };
};
