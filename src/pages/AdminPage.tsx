import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Trophy,
  Users,
  Calendar,
  Radio,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { useMatches, useCreateMatch, useUpdateMatch } from "@/hooks/useMatches";
import { useTournaments, useCreateTournament } from "@/hooks/useTournaments";
import {
  useTeams,
  useTeamsByTournament,
  useCreateTeam,
  type Team,
} from "@/hooks/useTeams";
import {
  useTeamRoster,
  useCreatePlayer,
  useDeletePlayer,
} from "@/hooks/usePlayers";

import { toast } from "sonner";
import type {
  MatchInsert,
  TournamentInsert,
} from "@/integrations/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Panel = "tournament" | "team" | "match" | null;

type PlayerRole = "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";

const ROLE_COLORS: Record<PlayerRole, string> = {
  Batsman: "bg-primary/15 text-primary border-primary/30",
  Bowler: "bg-live/15 text-live border-live/30",
  "All-rounder": "bg-gold/15 text-gold border-gold/30",
  Wicketkeeper: "bg-accent/15 text-accent-foreground border-accent/30",
};

// ─── AdminPage ────────────────────────────────────────────────────────────────

const AdminPage = () => {
  const [openPanel, setOpenPanel] = useState<Panel>(null);

  const { data: matches, isLoading: matchesLoading } = useMatches();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();

  const liveCount = matches?.filter((m) => m.status === "live").length ?? 0;

  const { data: allTeams } = useTeams();
  const teamCount = allTeams?.length ?? null;

  const togglePanel = (panel: Panel) =>
    setOpenPanel((prev) => (prev === panel ? null : panel));

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Admin Dashboard
        </h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Tournaments",
            value: tournamentsLoading ? "…" : (tournaments?.length ?? 0),
            icon: Trophy,
            color: "text-gold",
          },
          {
            label: "Total Matches",
            value: matchesLoading ? "…" : (matches?.length ?? 0),
            icon: Calendar,
            color: "text-primary",
          },
          {
            label: "Live Matches",
            value: matchesLoading ? "…" : liveCount,
            icon: Radio,
            color: "text-live",
          },
          {
            label: "Teams",
            value: teamCount === null ? "…" : teamCount,
            icon: Users,
            color: "text-accent",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border gradient-card p-4 shadow-card"
          >
            <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
            <p className="font-display text-2xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              {
                id: "tournament" as Panel,
                label: "Create Tournament",
                desc: "Set up a new tournament",
                icon: Trophy,
              },
              {
                id: "team" as Panel,
                label: "Add Team",
                desc: "Register a new team",
                icon: Users,
              },
              {
                id: "match" as Panel,
                label: "Create Match",
                desc: "Schedule a new match",
                icon: Calendar,
              },
            ] as const
          ).map((action) => (
            <button
              key={action.id}
              onClick={() => togglePanel(action.id)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all shadow-card ${
                openPanel === action.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border gradient-card hover:border-primary/30 hover:shadow-glow"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                {openPanel === action.id ? (
                  <X className="h-5 w-5 text-primary" />
                ) : (
                  <Plus className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-foreground text-sm">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
              {openPanel === action.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Inline Forms */}
        {openPanel === "tournament" && (
          <CreateTournamentForm onClose={() => setOpenPanel(null)} />
        )}
        {openPanel === "team" && (
          <CreateTeamForm
            tournaments={tournaments ?? []}
            onClose={() => setOpenPanel(null)}
          />
        )}
        {openPanel === "match" && (
          <CreateMatchForm
            tournaments={tournaments ?? []}
            onClose={() => setOpenPanel(null)}
          />
        )}
      </div>

      {/* ── Manage Teams & Players ── */}
      <ManageTeamsSection teams={allTeams ?? []} />

      {/* Manage Matches */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          Manage Matches
        </h2>

        {matchesLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading matches…
          </div>
        )}

        {!matchesLoading && matches?.length === 0 && (
          <div className="rounded-xl border border-border gradient-card p-8 text-center shadow-card">
            <p className="text-muted-foreground text-sm">
              No matches yet. Create one above to get started.
            </p>
          </div>
        )}

        {!matchesLoading && matches && matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((match) => (
              <MatchAdminRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Manage Teams Section ─────────────────────────────────────────────────────

interface ManageTeamsSectionProps {
  teams: Team[];
}

const ManageTeamsSection = ({ teams }: ManageTeamsSectionProps) => {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const toggle = (teamId: string) =>
    setExpandedTeam((prev) => (prev === teamId ? null : teamId));

  if (teams.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">
          Manage Teams &amp; Players
        </h2>
        <ShieldCheck className="h-4 w-4 text-primary" />
      </div>

      <div className="space-y-2">
        {teams.map((team) => (
          <TeamPlayersCard
            key={team.id}
            team={team}
            expanded={expandedTeam === team.id}
            onToggle={() => toggle(team.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Team Players Card ────────────────────────────────────────────────────────

interface TeamPlayersCardProps {
  team: Team;
  expanded: boolean;
  onToggle: () => void;
}

const TeamPlayersCard = ({
  team,
  expanded,
  onToggle,
}: TeamPlayersCardProps) => {
  const { data: roster, isLoading } = useTeamRoster(team.name);
  const deletePlayer = useDeletePlayer();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDelete = async (playerId: string, playerName: string) => {
    if (!confirm(`Remove ${playerName} from the squad?`)) return;
    try {
      await deletePlayer.mutateAsync(playerId);
      toast.success(`${playerName} removed from squad.`);
    } catch (err) {
      toast.error("Failed to remove player", {
        description: (err as Error).message,
      });
    }
  };

  const playerCount = roster?.length ?? 0;

  return (
    <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold text-foreground text-sm">
              {team.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading
                ? "…"
                : `${playerCount} player${playerCount !== 1 ? "s" : ""} in squad`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Role summary pills */}
          {!isLoading && roster && roster.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {(
                [
                  "Batsman",
                  "Bowler",
                  "All-rounder",
                  "Wicketkeeper",
                ] as PlayerRole[]
              ).map((role) => {
                const count = roster.filter((p) => p.role === role).length;
                if (count === 0) return null;
                return (
                  <span
                    key={role}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[role]}`}
                  >
                    {count}{" "}
                    {role === "All-rounder"
                      ? "AR"
                      : role === "Wicketkeeper"
                        ? "WK"
                        : role.slice(0, 3)}
                  </span>
                );
              })}
            </div>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {/* Player list */}
          {isLoading ? (
            <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading squad…
            </div>
          ) : roster && roster.length > 0 ? (
            <div className="divide-y divide-border/50">
              {roster.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/20 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground flex-shrink-0">
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {player.name}
                    </p>
                  </div>

                  {/* Role badge */}
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${ROLE_COLORS[player.role as PlayerRole] ?? "bg-secondary text-muted-foreground border-border"}`}
                  >
                    {player.role}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(player.id, player.name)}
                    disabled={deletePlayer.isPending}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-50"
                    title="Remove player"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No players in this squad yet.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add players below to build the team roster.
              </p>
            </div>
          )}

          {/* Add player area */}
          <div className="border-t border-border px-5 py-3">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 hover:border-primary/60 transition-all"
              >
                <UserPlus className="h-4 w-4" />
                Add Player to Squad
              </button>
            ) : (
              <AddPlayerForm
                teamName={team.name}
                onClose={() => setShowAddForm(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Add Player Form ──────────────────────────────────────────────────────────

interface AddPlayerFormProps {
  teamName: string;
  onClose: () => void;
}

const AddPlayerForm = ({ teamName, onClose }: AddPlayerFormProps) => {
  const createPlayer = useCreatePlayer();

  const [name, setName] = useState("");
  const [role, setRole] = useState<PlayerRole>("Batsman");
  const [battingOrder, setBattingOrder] = useState("");
  const [error, setError] = useState<string | null>(null);

  const roles: PlayerRole[] = [
    "Batsman",
    "Bowler",
    "All-rounder",
    "Wicketkeeper",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Player name is required.");
      return;
    }
    setError(null);

    try {
      await createPlayer.mutateAsync({
        name: name.trim(),
        team: teamName,
        role,
        match_id: null, // roster player — not linked to any match yet
        fantasy_points: 0,
      });
      toast.success(`${name.trim()} added to ${teamName}!`);
      // Reset and keep form open to add another player quickly
      setName("");
      setRole("Batsman");
      setBattingOrder("");
    } catch (err) {
      toast.error("Failed to add player", {
        description: (err as Error).message,
      });
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          New Player — <span className="text-primary">{teamName}</span>
        </p>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Name */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Full Name *
            </label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as PlayerRole)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Batting order (optional) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Batting Order{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              max={11}
              value={battingOrder}
              onChange={(e) => setBattingOrder(e.target.value)}
              placeholder="1 – 11"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Role preview badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Preview:</span>
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}
          >
            {role}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={createPlayer.isPending}
            className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
          >
            {createPlayer.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {createPlayer.isPending ? "Adding…" : "Add Player"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Done
          </button>
          <span className="text-xs text-muted-foreground ml-1">
            You can add multiple players before clicking Done.
          </span>
        </div>
      </form>
    </div>
  );
};

// ─── Match Admin Row ──────────────────────────────────────────────────────────

interface MatchAdminRowProps {
  match: {
    id: string;
    team1: string;
    team2: string;
    date: string;
    venue: string;
    status: "upcoming" | "live" | "completed";
    team1_score: string | null;
    team2_score: string | null;
    result: string | null;
  };
}

const MatchAdminRow = ({ match }: MatchAdminRowProps) => {
  const [editing, setEditing] = useState(false);
  const [score1, setScore1] = useState(match.team1_score ?? "");
  const [score2, setScore2] = useState(match.team2_score ?? "");
  const [result, setResult] = useState(match.result ?? "");
  const [status, setStatus] = useState<"upcoming" | "live" | "completed">(
    match.status,
  );

  const updateMatch = useUpdateMatch();

  const handleUpdate = async () => {
    try {
      await updateMatch.mutateAsync({
        id: match.id,
        team1_score: score1 || null,
        team2_score: score2 || null,
        result: result || null,
        status,
      });
      toast.success("Match updated successfully");
      setEditing(false);
    } catch (err) {
      toast.error("Failed to update match", {
        description: (err as Error).message,
      });
    }
  };

  return (
    <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
      {/* Row header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="font-display font-semibold text-foreground text-sm">
            {match.team1} vs {match.team2}
          </p>
          <p className="text-xs text-muted-foreground">
            {match.date} · {match.venue}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
              match.status === "live"
                ? "bg-live/15 text-live"
                : match.status === "upcoming"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {match.status}
          </span>

          {match.status !== "completed" && (
            <Link
              to={`/scorer?matchId=${match.id}&innings=1`}
              className="rounded-lg gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Score
            </Link>
          )}

          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="border-t border-border px-4 py-4 space-y-3 bg-secondary/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {match.team1} Score
              </label>
              <input
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                placeholder="e.g. 156/4 (20)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {match.team2} Score
              </label>
              <input
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                placeholder="e.g. 142/8 (20)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Result
            </label>
            <input
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="e.g. Engineering Lions won by 14 runs"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "upcoming" | "live" | "completed")
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button
            onClick={handleUpdate}
            disabled={updateMatch.isPending}
            className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          >
            {updateMatch.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {updateMatch.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Create Tournament Form ───────────────────────────────────────────────────

interface CreateTournamentFormProps {
  onClose: () => void;
}

const CreateTournamentForm = ({ onClose }: CreateTournamentFormProps) => {
  const createTournament = useCreateTournament();
  const [form, setForm] = useState<TournamentInsert>({
    name: "",
    start_date: "",
    end_date: "",
    teams: 0,
    matches: 0,
    status: "upcoming",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      await createTournament.mutateAsync(form);
      toast.success(`Tournament "${form.name}" created!`);
      onClose();
    } catch (err) {
      toast.error("Failed to create tournament", {
        description: (err as Error).message,
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4"
    >
      <h3 className="font-display font-bold text-foreground">New Tournament</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Tournament Name *
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Inter-College Premier League 2026"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Start Date *
          </label>
          <input
            required
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, start_date: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            End Date *
          </label>
          <input
            required
            type="date"
            value={form.end_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, end_date: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Number of Teams
          </label>
          <input
            type="number"
            min={0}
            value={form.teams}
            onChange={(e) =>
              setForm((f) => ({ ...f, teams: Number(e.target.value) }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Total Matches
          </label>
          <input
            type="number"
            min={0}
            value={form.matches}
            onChange={(e) =>
              setForm((f) => ({ ...f, matches: Number(e.target.value) }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as TournamentInsert["status"],
              }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={createTournament.isPending}
          className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {createTournament.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {createTournament.isPending ? "Creating…" : "Create Tournament"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ─── Create Team Form ─────────────────────────────────────────────────────────

interface LocalTournament {
  id: string;
  name: string;
}

interface CreateTeamFormProps {
  tournaments: LocalTournament[];
  onClose: () => void;
}

const CreateTeamForm = ({ tournaments, onClose }: CreateTeamFormProps) => {
  const createTeam = useCreateTeam();
  const [name, setName] = useState("");
  const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    setError(null);
    try {
      await createTeam.mutateAsync({
        name: name.trim(),
        tournament_id: tournamentId || null,
      });
      toast.success(`Team "${name.trim()}" added!`);
      onClose();
    } catch (err) {
      toast.error("Failed to add team", {
        description: (err as Error).message,
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4"
    >
      <h3 className="font-display font-bold text-foreground">New Team</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Team Name *
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Engineering Lions"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Tournament
          </label>
          <select
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">— No tournament —</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={createTeam.isPending}
          className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {createTeam.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {createTeam.isPending ? "Adding…" : "Add Team"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ─── Create Match Form ────────────────────────────────────────────────────────

interface CreateMatchFormProps {
  tournaments: LocalTournament[];
  onClose: () => void;
}

const CreateMatchForm = ({ tournaments, onClose }: CreateMatchFormProps) => {
  const createMatch = useCreateMatch();

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    tournaments[0]?.id ?? "",
  );

  // Fetch teams filtered by selected tournament (or all teams if none selected)
  const { data: availableTeams, isLoading: teamsLoading } =
    useTeamsByTournament(selectedTournamentId || null);

  const [form, setForm] = useState<Omit<MatchInsert, "id" | "created_at">>({
    team1: "",
    team2: "",
    date: "",
    time: "14:00",
    venue: "",
    tournament_id: tournaments[0]?.id ?? null,
    tournament_name: tournaments[0]?.name ?? "",
    status: "upcoming",
    team1_score: null,
    team2_score: null,
    result: null,
  });

  const handleTournamentChange = (id: string) => {
    const t = tournaments.find((x) => x.id === id);
    setSelectedTournamentId(id);
    // Reset team selections when tournament changes
    setForm((f) => ({
      ...f,
      tournament_id: id || null,
      tournament_name: t?.name ?? "",
      team1: "",
      team2: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.team1 || !form.team2 || !form.date || !form.venue) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.team1 === form.team2) {
      toast.error("Team 1 and Team 2 cannot be the same.");
      return;
    }
    try {
      await createMatch.mutateAsync(form);
      toast.success(
        `Match "${form.team1} vs ${form.team2}" scheduled on ${form.date}!`,
      );
      onClose();
    } catch (err) {
      toast.error("Failed to create match", {
        description: (err as Error).message,
      });
    }
  };

  const noTeams =
    !teamsLoading && (!availableTeams || availableTeams.length === 0);
  const team1Options: Team[] = availableTeams ?? [];
  const team2Options: Team[] = team1Options.filter(
    (t) => t.name !== form.team1,
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-foreground">New Match</h3>
        {!teamsLoading && availableTeams && availableTeams.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {availableTeams.length} team{availableTeams.length !== 1 ? "s" : ""}{" "}
            available
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Tournament */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Tournament
          </label>
          <select
            value={selectedTournamentId}
            onChange={(e) => handleTournamentChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">— Show all teams —</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* No teams warning */}
        {noTeams && (
          <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">
                No teams found
                {selectedTournamentId ? " for this tournament" : ""}.
              </p>
              <p className="text-xs mt-0.5 text-gold/80">
                Use <span className="font-semibold">Add Team</span> above to
                create teams first, then come back to schedule a match.
              </p>
            </div>
          </div>
        )}

        {/* Team 1 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Team 1 *
          </label>
          {teamsLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading teams…
            </div>
          ) : (
            <select
              required
              value={form.team1}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  team1: e.target.value,
                  team2: f.team2 === e.target.value ? "" : f.team2,
                }))
              }
              disabled={noTeams}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">— Select Team 1 —</option>
              {team1Options.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Team 2 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Team 2 *
          </label>
          {teamsLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading teams…
            </div>
          ) : (
            <select
              required
              value={form.team2}
              onChange={(e) =>
                setForm((f) => ({ ...f, team2: e.target.value }))
              }
              disabled={noTeams || !form.team1}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!form.team1 ? "— Select Team 1 first —" : "— Select Team 2 —"}
              </option>
              {team2Options.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* VS divider shown when both teams picked */}
        {form.team1 && form.team2 && (
          <div className="md:col-span-2 flex items-center justify-center gap-4 py-1">
            <span className="font-display font-bold text-foreground text-sm truncate max-w-[35%]">
              {form.team1}
            </span>
            <span className="text-xs text-muted-foreground rounded-full border border-border px-2.5 py-1 font-semibold">
              VS
            </span>
            <span className="font-display font-bold text-foreground text-sm truncate max-w-[35%]">
              {form.team2}
            </span>
          </div>
        )}

        {/* Date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Date *
          </label>
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {/* Time */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Time *
          </label>
          <input
            required
            type="time"
            value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {/* Venue */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Venue *
          </label>
          <input
            required
            value={form.venue}
            onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
            placeholder="e.g. College Ground A"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as "upcoming" | "live" | "completed",
              }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={
            createMatch.isPending || noTeams || !form.team1 || !form.team2
          }
          className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {createMatch.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {createMatch.isPending ? "Creating…" : "Create Match"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AdminPage;
