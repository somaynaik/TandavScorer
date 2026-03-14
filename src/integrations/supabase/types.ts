export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          teams: number;
          matches: number;
          status: "upcoming" | "ongoing" | "completed";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          teams?: number;
          matches?: number;
          status?: "upcoming" | "ongoing" | "completed";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          teams?: number;
          matches?: number;
          status?: "upcoming" | "ongoing" | "completed";
          created_at?: string;
        };
      };

      teams: {
        Row: {
          id: string;
          name: string;
          tournament_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tournament_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tournament_id?: string | null;
          created_at?: string;
        };
      };

      matches: {
        Row: {
          id: string;
          tournament_id: string | null;
          tournament_name: string;
          team1: string;
          team2: string;
          date: string;
          time: string;
          venue: string;
          status: "upcoming" | "live" | "completed";
          team1_score: string | null;
          team2_score: string | null;
          result: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id?: string | null;
          tournament_name?: string;
          team1: string;
          team2: string;
          date: string;
          time: string;
          venue: string;
          status?: "upcoming" | "live" | "completed";
          team1_score?: string | null;
          team2_score?: string | null;
          result?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string | null;
          tournament_name?: string;
          team1?: string;
          team2?: string;
          date?: string;
          time?: string;
          venue?: string;
          status?: "upcoming" | "live" | "completed";
          team1_score?: string | null;
          team2_score?: string | null;
          result?: string | null;
          created_at?: string;
        };
      };

      players: {
        Row: {
          id: string;
          name: string;
          team: string;
          role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
          match_id: string | null;
          batting_runs: number | null;
          balls_faced: number | null;
          fours: number | null;
          sixes: number | null;
          wickets: number | null;
          overs_bowled: number | null;
          runs_conceded: number | null;
          catches: number | null;
          fantasy_points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          team: string;
          role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
          match_id?: string | null;
          batting_runs?: number | null;
          balls_faced?: number | null;
          fours?: number | null;
          sixes?: number | null;
          wickets?: number | null;
          overs_bowled?: number | null;
          runs_conceded?: number | null;
          catches?: number | null;
          fantasy_points?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          team?: string;
          role?: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
          match_id?: string | null;
          batting_runs?: number | null;
          balls_faced?: number | null;
          fours?: number | null;
          sixes?: number | null;
          wickets?: number | null;
          overs_bowled?: number | null;
          runs_conceded?: number | null;
          catches?: number | null;
          fantasy_points?: number;
          created_at?: string;
        };
      };

      ball_events: {
        Row: {
          id: string;
          match_id: string;
          innings: 1 | 2 | 3 | 4;
          over_number: number;
          ball_number: number;
          runs: number;
          extras: "wide" | "noball" | "bye" | "legbye" | null;
          wicket: "Bowled" | "Caught" | "Run Out" | "LBW" | "Stumped" | null;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          innings?: 1 | 2 | 3 | 4;
          over_number: number;
          ball_number: number;
          runs?: number;
          extras?: "wide" | "noball" | "bye" | "legbye" | null;
          wicket?: "Bowled" | "Caught" | "Run Out" | "LBW" | "Stumped" | null;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          innings?: 1 | 2 | 3 | 4;
          over_number?: number;
          ball_number?: number;
          runs?: number;
          extras?: "wide" | "noball" | "bye" | "legbye" | null;
          wicket?: "Bowled" | "Caught" | "Run Out" | "LBW" | "Stumped" | null;
          description?: string;
          created_at?: string;
        };
      };

      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          is_admin: boolean;
          is_scorer: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_scorer?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_scorer?: boolean;
          created_at?: string;
        };
      };

      fantasy_teams: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          player_ids: string[];
          captain_id: string;
          vice_captain_id: string;
          total_points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          player_ids: string[];
          captain_id: string;
          vice_captain_id: string;
          total_points?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          player_ids?: string[];
          captain_id?: string;
          vice_captain_id?: string;
          total_points?: number;
          created_at?: string;
        };
      };
    };

    Views: {
      leaderboard: {
        Row: {
          rank: number;
          name: string;
          points: number;
          matches_played: number;
          user_id: string;
        };
      };
    };

    Functions: {
      recalculate_fantasy_points: {
        Args: { p_match_id: string };
        Returns: void;
      };
    };

    Enums: {
      tournament_status: "upcoming" | "ongoing" | "completed";
      match_status: "upcoming" | "live" | "completed";
      player_role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
      extras_type: "wide" | "noball" | "bye" | "legbye";
      wicket_type: "Bowled" | "Caught" | "Run Out" | "LBW" | "Stumped";
    };
  };
}

// ─── Convenience row aliases ─────────────────────────────────────────────────

export type Tournament       = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentInsert = Database["public"]["Tables"]["tournaments"]["Insert"];
export type TournamentUpdate = Database["public"]["Tables"]["tournaments"]["Update"];

export type Team             = Database["public"]["Tables"]["teams"]["Row"];
export type TeamInsert       = Database["public"]["Tables"]["teams"]["Insert"];

export type Match            = Database["public"]["Tables"]["matches"]["Row"];
export type MatchInsert      = Database["public"]["Tables"]["matches"]["Insert"];
export type MatchUpdate      = Database["public"]["Tables"]["matches"]["Update"];

export type Player           = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert     = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate     = Database["public"]["Tables"]["players"]["Update"];

export type BallEvent        = Database["public"]["Tables"]["ball_events"]["Row"];
export type BallEventInsert  = Database["public"]["Tables"]["ball_events"]["Insert"];

export type Profile          = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate    = Database["public"]["Tables"]["profiles"]["Update"];

export type FantasyTeam       = Database["public"]["Tables"]["fantasy_teams"]["Row"];
export type FantasyTeamInsert = Database["public"]["Tables"]["fantasy_teams"]["Insert"];
export type FantasyTeamUpdate = Database["public"]["Tables"]["fantasy_teams"]["Update"];

export type LeaderboardEntry  = Database["public"]["Views"]["leaderboard"]["Row"];
