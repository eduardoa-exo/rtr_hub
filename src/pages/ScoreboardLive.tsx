import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Settings } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { RacingLoader } from "@/components/RacingLoader";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  calculateAllScenarios,
  type ChampionshipStanding,
  type RacePointsScale,
  type ScenarioLine,
  type ClassScenarios,
} from "@/domain/scoreboard/calculateScenarios";

interface ScoreboardConfig {
  id: number;
  enabled: boolean;
  title: string;
  intro: string | null;
  championship_class?: "LMP2" | "GT3 PRO" | "BOTH" | null;
  focus_car_number?: string | null;
  rival_car_numbers?: string[] | null;
  updated_at: string;
}

export default function ScoreboardLive() {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ScoreboardConfig | null>(null);
  const [classScenarios, setClassScenarios] = useState<ClassScenarios[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: configData, error: configError } = await supabase
          .from("scoreboard_live_config")
          .select("*")
          .eq("id", 1)
          .single();

        if (configError) {
          if (configError.code === "PGRST116") {
            console.log("Scoreboard config not found (table may not exist yet)");
            setLoading(false);
            return;
          }
          throw configError;
        }

        if (!configData || !configData.enabled) {
          navigate("/");
          return;
        }

        setConfig(configData);

        const championshipClass = configData.championship_class || "BOTH";
        const focusCarNumber = configData.focus_car_number;
        const rivalCarNumbers = configData.rival_car_numbers || [];

        if (!focusCarNumber || rivalCarNumbers.length === 0) {
          console.log("Focus or rival cars not configured yet");
          setLoading(false);
          return;
        }

        const { data: standings, error: standingsError } = await supabase
          .from("championship_standings")
          .select("*")
          .order("rank", { ascending: true });

        if (standingsError) throw standingsError;

        const { data: scaleData, error: scaleError } = await supabase
          .from("race_points_scale")
          .select("*")
          .order("position", { ascending: true });

        if (scaleError && scaleError.code !== "42P01") {
          console.warn("Error loading points scale, using fallback:", scaleError);
        }

        const scenarios = calculateAllScenarios(
          championshipClass as "LMP2" | "GT3 PRO" | "BOTH",
          standings as ChampionshipStanding[],
          {
            focus_car_number: focusCarNumber,
            rival_car_numbers: rivalCarNumbers,
          },
          scaleData as RacePointsScale[] | undefined
        );

        setClassScenarios(scenarios);
      } catch (error) {
        console.error("Error fetching scoreboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const getVariantStyles = (variant: "win" | "lose" | "neutral") => {
    switch (variant) {
      case "win":
        return "bg-green-500/10 border-green-500/30 text-green-300";
      case "lose":
        return "bg-red-500/10 border-red-500/30 text-red-300";
      case "neutral":
        return "bg-blue-500/10 border-blue-500/30 text-blue-300";
    }
  };

  const getVariantIcon = (variant: "win" | "lose" | "neutral") => {
    switch (variant) {
      case "win":
        return "✓";
      case "lose":
        return "✗";
      case "neutral":
        return "•";
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <Header />
        <RacingLoader className="min-h-[50vh]" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="page-shell">
        <Header />
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              O Scoreboard Live não está disponível no momento.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Header />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,_hsl(24_90%_50%_/_0.12)_0%,_hsl(268_40%_30%_/_0.06)_40%,_transparent_70%)]" />
        <div className="container py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="font-racing text-2xl sm:text-4xl md:text-6xl font-bold mb-4 racing-glow"
            >
              <Trophy className="inline-block h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 mr-2 sm:mr-4 text-primary" />
              <span className="text-gradient-racing">{config.title}</span>
            </motion.h1>
            {config.intro && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto whitespace-pre-wrap"
              >
                {config.intro}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      <main className="container py-8">
        {isAdmin && (
          <div className="max-w-4xl mx-auto mb-6">
            <Link to="/scoreboard-live-admin">
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Gerir Scoreboard
              </Button>
            </Link>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-8">
          {classScenarios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum cenário disponível no momento.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Verifique se o carro e rivais foram configurados.
              </p>
            </div>
          ) : (
            classScenarios.map((classData) => (
              <div key={classData.class} className="space-y-4">
                {classScenarios.length > 1 && (
                  <h2 className="font-racing text-xl font-bold text-center">
                    {classData.class}
                  </h2>
                )}

                {classData.gaps.length > 0 && (
                  <div className="card-racing p-4 border border-border/50">
                    <h3 className="font-racing text-sm mb-2 text-muted-foreground">
                      Situação atual
                    </h3>
                    <div className="space-y-1 text-sm">
                      {classData.focusStanding && (
                        <div>
                          <span className="font-bold">
                            #{classData.focusStanding.car_number}
                          </span>{" "}
                          - {classData.focusStanding.points} pontos (P
                          {classData.focusStanding.rank})
                        </div>
                      )}
                      {classData.gaps.map((gap) => (
                        <div key={gap.rival.car_number}>
                          <span className="font-bold">
                            #{gap.rival.car_number}
                          </span>{" "}
                          - {gap.rival.points} pontos (P{gap.rival.rank}) -{" "}
                          <span
                            className={
                              gap.pointsGap > 0
                                ? "text-red-400"
                                : "text-green-400"
                            }
                          >
                            {gap.pointsGap > 0 ? "+" : ""}
                            {gap.pointsGap} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {classData.scenarios.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      Carros não encontrados na classificação de {classData.class}
                      .
                    </p>
                  </div>
                ) : (
                  classData.scenarios.map((line, index) => (
                    <motion.div
                      key={`${classData.class}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`card-racing p-4 sm:p-6 border-2 ${getVariantStyles(
                        line.result_variant
                      )}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex-shrink-0 text-2xl sm:text-3xl font-bold">
                          {getVariantIcon(line.result_variant)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="font-racing text-sm sm:text-base text-muted-foreground">
                            {line.condition_label}
                          </div>
                          <div className="text-base sm:text-lg font-bold">
                            {line.result_label}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
