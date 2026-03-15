import { Loader2, Shield, Users } from "lucide-react";
import { useTeams, type Team } from "@/hooks/useTeams";
import { useTeamRoster } from "@/hooks/usePlayers";

const TeamsPage = () => {
  const { data: teamsData, isLoading, error } = useTeams();
  const teams: Team[] = teamsData ?? [];

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Teams
        </p>
        <h1 className="font-display text-4xl font-bold text-foreground">
          Teams And Squads
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          View all registered teams and their current squad players.
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center gap-3 rounded-2xl border border-border bg-card shadow-card">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading teams...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load teams.
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <p className="font-medium text-foreground">No teams available yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Teams will appear here once they are created by the admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
};

const TeamCard = ({ team }: { team: Team }) => {
  const { data: roster = [], isLoading } = useTeamRoster(team.name);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-secondary/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-foreground">
              {team.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading squad..."
                : `${roster.length} player${roster.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading squad...
        </div>
      ) : roster.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">
          No players added for this team yet.
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {roster.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {player.name}
                </p>
                <p className="text-xs text-muted-foreground">{player.role}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Users className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
