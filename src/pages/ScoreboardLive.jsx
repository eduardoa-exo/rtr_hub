import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/layout/PageHero";
import { RacingLoader } from "@/components/RacingLoader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/queries/queryKeys";
import {
  useRacePointsScale,
  useScoreboardLiveGrid,
  useScoreboardLiveSession,
  useScoreboardStandings,
} from "@/hooks/queries/useScoreboardLive";
import { projectLiveGrid } from "@/domain/scoreboard/projectLiveGrid";
import { ScoreboardKpis } from "@/components/scoreboard/ScoreboardKpis";
import { ScoreboardLiveGridTable } from "@/components/scoreboard/ScoreboardLiveGrid";

export default function ScoreboardLive() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
  } = useScoreboardLiveSession();

  const [activeClass, setActiveClass] = useState("LMP2");
  const [optimisticGrid, setOptimisticGrid] = useState(null);
  const [mutating, setMutating] = useState(false);

  // Sync active class from session
  useEffect(() => {
    if (!session) return;
    if (session.championship_class === "BOTH") return;
    setActiveClass(session.championship_class);
  }, [session]);

  // Gate: non-admins leave when disabled; admins can stay to enable
  useEffect(() => {
    if (sessionLoading || adminLoading) return;
    if (sessionError) return;
    if (!session) {
      if (!isAdmin) navigate("/", { replace: true });
      return;
    }
    if (!session.enabled && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [session, sessionLoading, sessionError, isAdmin, adminLoading, navigate]);

  const canFetchGrid = Boolean(session && (session.enabled || isAdmin));

  const {
    data: remoteGrid,
    isLoading: gridLoading,
    markOptimisticVersion,
  } = useScoreboardLiveGrid(activeClass, session?.grid_version, canFetchGrid);

  const { data: standings = [], isLoading: standingsLoading } =
    useScoreboardStandings(activeClass);
  const { data: scale = [], isLoading: scaleLoading } = useRacePointsScale();

  // Clear optimistic overlay when remote grid catches up
  useEffect(() => {
    setOptimisticGrid(null);
  }, [remoteGrid]);

  const gridRows = useMemo(() => {
    const source = optimisticGrid ?? remoteGrid ?? [];
    return source.map((r) => ({
      id: r.id,
      class: r.class,
      car_number: r.car_number,
      sort_order: r.sort_order,
      participates: r.participates ?? true,
      team_name: r.team_name,
      country_code: r.country_code,
      car_logo_url: r.car_logo_url,
    }));
  }, [optimisticGrid, remoteGrid]);

  const { rows, kpis } = useMemo(
    () => projectLiveGrid(gridRows, standings, scale, activeClass),
    [gridRows, standings, scale, activeClass],
  );

  const showBothTabs = session?.championship_class === "BOTH";

  const applyLocalOrder = useCallback(
    (orderedCarNumbers) => {
      const base = optimisticGrid ?? remoteGrid ?? [];
      const byCar = new Map(base.map((r) => [r.car_number, r]));
      const next = orderedCarNumbers
        .map((car, idx) => {
          const row = byCar.get(car);
          if (!row) return null;
          return { ...row, sort_order: idx + 1 };
        })
        .filter((r) => r !== null);
      setOptimisticGrid(next);
      queryClient.setQueryData(
        queryKeys.scoreboardLive.grid(activeClass),
        next,
      );
    },
    [optimisticGrid, remoteGrid, queryClient, activeClass],
  );

  const handleReorder = async (orderedCarNumbers) => {
    if (!isAdmin || mutating) return;
    applyLocalOrder(orderedCarNumbers);
    setMutating(true);
    try {
      const { error } = await supabase.rpc("reorder_scoreboard_live_grid", {
        p_class: activeClass,
        p_ordered_car_numbers: orderedCarNumbers,
      });
      if (error) throw error;
      const nextVersion = (session?.grid_version ?? 0) + 1;
      markOptimisticVersion(nextVersion);
      queryClient.setQueryData(queryKeys.scoreboardLive.session(), (prev) =>
        prev ? { ...prev, grid_version: nextVersion } : prev,
      );
    } catch (err) {
      console.error(err);
      setOptimisticGrid(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.scoreboardLive.grid(activeClass),
      });
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível guardar a ordem da grelha.",
        variant: "destructive",
      });
    } finally {
      setMutating(false);
    }
  };

  const handleToggleParticipates = async (id, participates) => {
    if (!isAdmin || mutating) return;
    const base = optimisticGrid ?? remoteGrid ?? [];
    const next = base.map((r) => (r.id === id ? { ...r, participates } : r));
    setOptimisticGrid(next);
    queryClient.setQueryData(queryKeys.scoreboardLive.grid(activeClass), next);
    setMutating(true);
    try {
      const { error } = await supabase.rpc("set_scoreboard_live_participates", {
        p_id: id,
        p_participates: participates,
      });
      if (error) throw error;
      const nextVersion = (session?.grid_version ?? 0) + 1;
      markOptimisticVersion(nextVersion);
      queryClient.setQueryData(queryKeys.scoreboardLive.session(), (prev) =>
        prev ? { ...prev, grid_version: nextVersion } : prev,
      );
    } catch (err) {
      console.error(err);
      setOptimisticGrid(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.scoreboardLive.grid(activeClass),
      });
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a participação.",
        variant: "destructive",
      });
    } finally {
      setMutating(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin || mutating) return;
    setMutating(true);
    try {
      const { error } = await supabase.rpc("reset_scoreboard_live_grid", {
        p_class: activeClass,
      });
      if (error) throw error;
      const nextVersion = (session?.grid_version ?? 0) + 1;
      markOptimisticVersion(nextVersion);
      queryClient.setQueryData(queryKeys.scoreboardLive.session(), (prev) =>
        prev ? { ...prev, grid_version: nextVersion } : prev,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.scoreboardLive.grid(activeClass),
      });
      toast({
        title: "Grelha reposta",
        description: "Ordem alinhada com a classificação.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao repor",
        description: "Não foi possível repor a grelha.",
        variant: "destructive",
      });
    } finally {
      setMutating(false);
    }
  };

  const handleToggleEnabled = async (enabled) => {
    if (!isAdmin || mutating) return;
    setMutating(true);
    try {
      const { error } = await supabase
        .from("scoreboard_live_session")
        .update({ enabled })
        .eq("id", 1);
      if (error) throw error;
      queryClient.setQueryData(queryKeys.scoreboardLive.session(), (prev) =>
        prev ? { ...prev, enabled } : prev,
      );
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o estado da sessão.",
        variant: "destructive",
      });
    } finally {
      setMutating(false);
    }
  };

  const handleClassMode = async (mode) => {
    if (!isAdmin || mutating) return;
    setMutating(true);
    try {
      const { error } = await supabase
        .from("scoreboard_live_session")
        .update({ championship_class: mode })
        .eq("id", 1);
      if (error) throw error;
      queryClient.setQueryData(queryKeys.scoreboardLive.session(), (prev) =>
        prev ? { ...prev, championship_class: mode } : prev,
      );
      if (mode !== "BOTH") setActiveClass(mode);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a classe.",
        variant: "destructive",
      });
    } finally {
      setMutating(false);
    }
  };

  const loading =
    sessionLoading ||
    adminLoading ||
    (canFetchGrid && (gridLoading || standingsLoading || scaleLoading));

  if (loading) {
    return (
      <PageShell>
        <RacingLoader className="min-h-[50vh]" />
      </PageShell>
    );
  }

  if (!session && !isAdmin) {
    return (
      <PageShell>
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              O Scoreboard Live não está disponível no momento.
            </p>
          </div>
        </main>
      </PageShell>
    );
  }

  if (session && !session.enabled && !isAdmin) {
    return (
      <PageShell>
        <RacingLoader className="min-h-[50vh]" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        compact
        title={
          <>
            <span className="text-gradient-racing">Scoreboard Live</span>
          </>
        }
        subtitle="Projeção de pontos em tempo real com base na ordem de pista."
      />

      <main className="container py-6 md:py-8">
        {isAdmin && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-border/60 bg-card/30 p-4">
            <div className="flex items-center gap-3">
              <Switch
                id="session-enabled"
                checked={Boolean(session?.enabled)}
                disabled={mutating}
                onCheckedChange={handleToggleEnabled}
              />

              <Label
                htmlFor="session-enabled"
                className="font-racing text-sm uppercase tracking-wider"
              >
                Ativo
              </Label>
            </div>

            <div className="flex flex-wrap gap-2">
              {["LMP2", "GT3 PRO", "BOTH"].map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={
                    session?.championship_class === mode ? "default" : "outline"
                  }
                  className="font-racing text-xs uppercase"
                  disabled={mutating}
                  onClick={() => void handleClassMode(mode)}
                >
                  {mode === "BOTH" ? "Ambas" : mode}
                </Button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="gap-2 sm:ml-auto"
              disabled={mutating}
              onClick={() => void handleReset()}
            >
              <RotateCcw className="h-4 w-4" />
              Repor grelha
            </Button>
          </div>
        )}

        {(showBothTabs || isAdmin) && (
          <div className="flex justify-center gap-2 mb-6">
            {["LMP2", "GT3 PRO"].map((cls) => {
              const disabledTab =
                !showBothTabs &&
                session?.championship_class !== "BOTH" &&
                session?.championship_class !== cls &&
                !isAdmin;
              if (
                session?.championship_class !== "BOTH" &&
                session?.championship_class &&
                session.championship_class !== cls &&
                !isAdmin
              ) {
                return null;
              }
              return (
                <button
                  key={cls}
                  type="button"
                  disabled={Boolean(disabledTab)}
                  onClick={() => setActiveClass(cls)}
                  className={`font-racing text-sm uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all ${
                    activeClass === cls
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cls}
                </button>
              );
            })}
          </div>
        )}

        {!session?.enabled && isAdmin && (
          <p className="text-center text-sm text-amber-400 mb-4">
            Sessão desativada — apenas admins veem esta página. Ative para o
            público.
          </p>
        )}

        <ScoreboardKpis kpis={kpis} />

        {rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma equipa na grelha de {activeClass}.
            {isAdmin && (
              <div className="mt-4">
                <Button variant="outline" onClick={() => void handleReset()}>
                  Repor grelha a partir da classificação
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ScoreboardLiveGridTable
            rows={rows}
            isAdmin={isAdmin}
            onReorder={(cars) => void handleReorder(cars)}
            onToggleParticipates={(id, value) =>
              void handleToggleParticipates(id, value)
            }
            busy={mutating}
          />
        )}
      </main>
    </PageShell>
  );
}
