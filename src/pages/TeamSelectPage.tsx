import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Crown,
  Star,
  Check,
  Loader2,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMatch } from "@/hooks/useMatches";
import { usePlayersByMatch, useTeamRoster } from "@/hooks/usePlayers";
import {
  useUpsertFantasyTeam,
  useMyFantasyTeamForMatch,
} from "@/hooks/useFantasyTeam";
import { useAuth } from "@/hooks/useAuth";
import type { FantasyTeam, Match, Player } from "@/integrations/supabase/types";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  Batsman: "bg-primary/15 text-primary",
  Bowler: "bg-live/15 text-live",
  "All-rounder": "bg-gold/15 text-gold",
  Wicketkeeper: "bg-accent/15 text-accent-foreground",
};

const TeamSelectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: matchData, isLoading: matchLoading } = useMatch(id!);
  const match: Match | null = matchData ?? null;
  const { data: playersData, isLoading: playersLoading } = usePlayersByMatch(id!);
  const players: Player[] = playersData ?? [];
  const { data: team1Roster = [], isLoading: team1RosterLoading } = useTeamRoster(
    match?.team1 ?? "",
  );
  const { data: team2Roster = [], isLoading: team2RosterLoading } = useTeamRoster(
    match?.team2 ?? "",
  );
  const { data: existingTeamData, isLoading: existingLoading } =
    useMyFantasyTeamForMatch(id!);
  const existingTeam: FantasyTeam | null = existingTeamData ?? null;

  const upsertTeam = useUpsertFantasyTeam();

  const [selected, setSelected] = useState<string[]>([]);
  const [captain, setCaptain] = useState<string | null>(null);
  const [viceCaptain, setViceCaptain] = useState<string | null>(null);

  useEffect(() => {
    if (!existingTeam) return;
    setSelected(existingTeam.player_ids ?? []);
    setCaptain(existingTeam.captain_id ?? null);
    setViceCaptain(existingTeam.vice_captain_id ?? null);
  }, [existingTeam]);

  const isLoading =
    matchLoading ||
    playersLoading ||
    team1RosterLoading ||
    team2RosterLoading ||
    authLoading ||
    existingLoading;

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container py-16 text-center space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Match not found.</p>
        <Link
          to="/matches"
          className="text-primary hover:underline text-sm inline-block"
        >
          Back to matches
        </Link>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-16 text-center space-y-4 max-w-sm mx-auto">
        <LogIn className="mx-auto h-10 w-10 text-primary" />
        <p className="font-display font-bold text-foreground text-xl">
          Sign in to play
        </p>
        <p className="text-sm text-muted-foreground">
          You need to be signed in to pick a fantasy team.
        </p>
        <Link
          to="/matches"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to matches
        </Link>
      </div>
    );
  }

  const currentMatch = match;

  const matchPlayers = players;
  const allPlayers =
    matchPlayers.length > 0 ? matchPlayers : [...team1Roster, ...team2Roster];

  const team1Players = allPlayers.filter((p) => p.team === currentMatch.team1);
  const team2Players = allPlayers.filter((p) => p.team === currentMatch.team2);

  const playerById = new Map(allPlayers.map((p) => [p.id, p]));
  const selectedTeam1Count = selected.filter(
    (pid) => playerById.get(pid)?.team === currentMatch.team1,
  ).length;
  const selectedTeam2Count = selected.filter(
    (pid) => playerById.get(pid)?.team === currentMatch.team2,
  ).length;

  const togglePlayer = (pid: string) => {
    const player = playerById.get(pid);
    if (!player) return;

    if (selected.includes(pid)) {
      setSelected(selected.filter((s) => s !== pid));
      if (captain === pid) setCaptain(null);
      if (viceCaptain === pid) setViceCaptain(null);
      return;
    }

    if (selected.length >= 11) return;

    const teamCount =
      player.team === currentMatch.team1 ? selectedTeam1Count : selectedTeam2Count;

    if (teamCount >= 6) {
      toast.error(`Maximum 6 players allowed from ${player.team}.`);
      return;
    }

    setSelected([...selected, pid]);
  };

  const handleCaptain = (pid: string) => {
    if (!selected.includes(pid)) return;
    if (viceCaptain === pid) setViceCaptain(null);
    setCaptain(captain === pid ? null : pid);
  };

  const handleViceCaptain = (pid: string) => {
    if (!selected.includes(pid)) return;
    if (captain === pid) setCaptain(null);
    setViceCaptain(viceCaptain === pid ? null : pid);
  };

  const handleSave = async () => {
    if (selected.length !== 11 || !captain || !viceCaptain) return;

    if (selectedTeam1Count < 5 || selectedTeam2Count < 5) {
      toast.error("Team combination must be 6-5 or 5-6.");
      return;
    }

    try {
      const result = await upsertTeam.mutateAsync({
        match_id: id!,
        player_ids: selected,
        captain_id: captain,
        vice_captain_id: viceCaptain,
      });

      toast.success(
        result.action === "created"
          ? "Fantasy team saved!"
          : "Fantasy team updated!",
        { description: "Good luck! Check the leaderboard after the match." },
      );

      navigate(`/match/${id}`);
    } catch (err) {
      toast.error("Failed to save team", {
        description: (err as Error).message,
      });
    }
  };

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <Link
        to={`/match/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to match
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Pick Your Fantasy XI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentMatch.team1} vs {currentMatch.team2} - Select {11 - selected.length} more
          player{11 - selected.length !== 1 && "s"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Team split rule: max 6 from one team and minimum 5 from the other.
        </p>
        {existingTeam && (
          <p className="text-xs text-primary mt-1 font-medium">
            You already have a team for this match - editing it now.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full gradient-primary transition-all"
            style={{ width: `${(selected.length / 11) * 100}%` }}
          />
        </div>
        <span className="text-sm font-display font-bold text-primary">
          {selected.length}/11
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-muted-foreground">
          {currentMatch.team1}: <span className="font-semibold text-foreground">{selectedTeam1Count}/6</span>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-muted-foreground">
          {currentMatch.team2}: <span className="font-semibold text-foreground">{selectedTeam2Count}/6</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Crown className="h-3.5 w-3.5 text-gold" /> Captain (2x)
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-primary" /> Vice Captain (1.5x)
        </span>
      </div>

      {allPlayers.length === 0 && (
        <div className="rounded-xl border border-border gradient-card p-10 text-center shadow-card">
          <p className="text-muted-foreground text-sm">
            No players found in either team roster yet. Add team players in
            Admin first.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <TeamColumn
          teamName={currentMatch.team1}
          players={team1Players}
          selected={selected}
          captain={captain}
          viceCaptain={viceCaptain}
          onToggle={togglePlayer}
          onCaptain={handleCaptain}
          onViceCaptain={handleViceCaptain}
        />
        <TeamColumn
          teamName={currentMatch.team2}
          players={team2Players}
          selected={selected}
          captain={captain}
          viceCaptain={viceCaptain}
          onToggle={togglePlayer}
          onCaptain={handleCaptain}
          onViceCaptain={handleViceCaptain}
        />
      </div>

      {selected.length === 11 && captain && viceCaptain && (
        <button
          onClick={handleSave}
          disabled={upsertTeam.isPending}
          className="w-full rounded-xl gradient-primary py-4 font-display font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {upsertTeam.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {upsertTeam.isPending
            ? "Saving..."
            : existingTeam
              ? "Update Fantasy Team"
              : "Save Fantasy Team"}
        </button>
      )}

      {(selected.length < 11 || !captain || !viceCaptain) && selected.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {selected.length < 11 &&
            `Select ${11 - selected.length} more player${11 - selected.length !== 1 ? "s" : ""}. `}
          {selected.length === 11 && (selectedTeam1Count < 5 || selectedTeam2Count < 5) &&
            "Team combination must be 6-5 or 5-6. "}
          {selected.length === 11 && !captain &&
            "Tap C on a player to set your Captain. "}
          {selected.length === 11 && captain && !viceCaptain &&
            "Tap VC on a player to set your Vice Captain."}
        </p>
      )}
    </div>
  );
};

type TeamColumnProps = {
  teamName: string;
  players: Player[];
  selected: string[];
  captain: string | null;
  viceCaptain: string | null;
  onToggle: (id: string) => void;
  onCaptain: (id: string) => void;
  onViceCaptain: (id: string) => void;
};

const TeamColumn = ({
  teamName,
  players,
  selected,
  captain,
  viceCaptain,
  onToggle,
  onCaptain,
  onViceCaptain,
}: TeamColumnProps) => (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-foreground">{teamName}</p>
    {players.length === 0 && (
      <div className="rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
        No players available.
      </div>
    )}
    {players.map((p) => {
      const isSelected = selected.includes(p.id);
      const isCap = captain === p.id;
      const isVC = viceCaptain === p.id;

      return (
        <div
          key={p.id}
          onClick={() => onToggle(p.id)}
          className={`flex items-center gap-3 rounded-xl border p-4 transition-all cursor-pointer ${
            isSelected
              ? "border-primary/40 bg-primary/5"
              : "border-border gradient-card hover:border-primary/20"
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
              isSelected
                ? "gradient-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {isSelected ? <Check className="h-4 w-4" /> : p.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground truncate">{p.name}</p>
              {isCap && <Crown className="h-4 w-4 text-gold flex-shrink-0" />}
              {isVC && <Star className="h-4 w-4 text-primary flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  roleColors[p.role] ?? "bg-secondary text-muted-foreground"
                }`}
              >
                {p.role}
              </span>
              {p.fantasy_points !== null && p.fantasy_points > 0 && (
                <span className="text-xs font-display font-bold text-primary ml-auto">
                  {p.fantasy_points} pts
                </span>
              )}
            </div>
          </div>

          {isSelected && (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onCaptain(p.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  isCap
                    ? "gradient-gold border-gold text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-gold hover:text-gold"
                }`}
              >
                C
              </button>
              <button
                onClick={() => onViceCaptain(p.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  isVC
                    ? "gradient-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                VC
              </button>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default TeamSelectPage;
