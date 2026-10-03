import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Calendar, Loader2, Trash2, PlayCircle, Link2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/layout/PageHero";
import { RaceEventsList } from "@/components/race/RaceEventsList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { RacingLoader } from "@/components/RacingLoader";
import { usePalmares } from "@/hooks/queries/useAchievements";
import { useCategories } from "@/hooks/queries/useCategories";
import { queryKeys } from "@/hooks/queries/queryKeys";
import type { Database } from "@/integrations/supabase/types";

type Race = Database["public"]["Tables"]["races"]["Row"];

export default function Palmares() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: palmaresData, isLoading: loading } = usePalmares();
  const { data: categoriesData = [] } = useCategories();
  const races = palmaresData?.races ?? [];
  const racePositions = palmaresData?.racePositions ?? {};
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [raceToDelete, setRaceToDelete] = useState<Race | null>(null);

  const categoryColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const cat of categoriesData) {
      if (cat.color) colors[cat.name] = cat.color;
    }
    return colors;
  }, [categoriesData]);

  const invalidatePalmares = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all });

  const formatDate = (d: string | null) => {
    if (!d) return "Data não especificada";
    try {
      return new Date(d).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const openDelete = (race: Race, e: React.MouseEvent) => {
    e.stopPropagation();
    setRaceToDelete(race);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!raceToDelete?.id) return;

    const { error } = await supabase
      .from("races")
      .delete()
      .eq("id", raceToDelete.id);

    if (error) {
      toast({
        title: "Erro ao apagar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Corrida apagada!" });
      invalidatePalmares();
    }

    setDeleteDialogOpen(false);
    setRaceToDelete(null);
  };

  const handleSetLiveLink = async (race: Race, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!race.id) return;

    const currentValue = race.replay_url ?? "";
    const nextValue = window
      .prompt("Link da live (YouTube/Twitch). Deixa vazio para remover.", currentValue)
      ?.trim();

    if (nextValue === undefined || nextValue === currentValue) return;

    if (nextValue && !/^https?:\/\//i.test(nextValue)) {
      toast({
        title: "Link inválido",
        description: "O link deve começar por http:// ou https://",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("races")
      .update({ replay_url: nextValue || null })
      .eq("id", race.id);

    if (error) {
      toast({
        title: "Erro ao guardar link",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setRaces((prev) =>
      prev.map((item) =>
        item.id === race.id ? { ...item, replay_url: nextValue || null } : item
      )
    );

    toast({
      title: nextValue ? "Link da live atualizado!" : "Link da live removido!",
    });
  };

  type TimelineItem =
    | { type: "year"; year: number }
    | { type: "race"; race: Race };

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    let lastYear: number | null = null;
    for (const race of races) {
      const y = race.date ? new Date(race.date).getFullYear() : null;
      if (y != null && y !== lastYear) {
        items.push({ type: "year", year: y });
        lastYear = y;
      }
      items.push({ type: "race", race });
    }
    return items;
  }, [races]);

  return (
    <PageShell>
      <PageHero
        title="Palmarés"
        subtitle="Os melhores momentos e conquistas da Ric Team Racing ao longo das temporadas."
      />

      {/* Content */}
      <main className="container py-12">
        {loading ? (
          <RacingLoader className="py-12" />
        ) : races.length === 0 ? (
          <div className="card-racing p-12 text-center max-w-lg mx-auto">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-racing text-xl mb-2">Em Construção</h2>
            <p className="text-muted-foreground">
              O palmarés da equipa será adicionado em breve. Fica atento às nossas conquistas!
            </p>
          </div>
        ) : (
          <>
            <div className="relative max-w-3xl mx-auto">
              {/* Linha da cronologia */}
              <div
                className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary to-primary/50"
                aria-hidden
              />

              <div className="space-y-0">
                {timelineItems.map((item, index) => {
                  if (item.type === "year") {
                    return (
                      <motion.div
                        key={`year-${item.year}`}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{ duration: 0.4 }}
                        className="relative flex items-center gap-4 sm:gap-6 py-4 first:pt-0"
                      >
                        <div className="flex w-10 shrink-0 justify-center">
                          <div
                            className="relative z-10 h-3 w-3 rotate-45 rounded-sm border-2 border-primary bg-primary/20"
                            aria-hidden
                          />
                        </div>
                        <span className="font-racing text-sm font-bold uppercase tracking-wider text-primary">
                          {item.year}
                        </span>
                      </motion.div>
                    );
                  }

                  const race = item.race;
                  return (
                    <motion.div
                      key={race.id}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{ duration: 0.5 }}
                      className="relative flex items-start gap-4 sm:gap-6 py-6 last:pb-0"
                    >
                      <div className="flex w-10 shrink-0 justify-center pt-1.5">
                        <div
                          className="relative z-10 h-4 w-4 rounded-full border-2 border-primary bg-background ring-4 ring-background"
                          aria-hidden
                        />
                      </div>

                      <motion.div
                        className="card-racing group relative min-w-0 flex-1 cursor-pointer overflow-hidden transition-colors hover:border-primary/50"
                        style={
                          race.tipo === "vsca"
                            ? {
                                background:
                                  "linear-gradient(180deg, hsl(215 25% 22%) 0%, hsl(215 20% 16%) 100%)",
                                borderColor: "hsl(215 25% 28%)",
                              }
                            : race.tipo === "iracing"
                              ? {
                                  background:
                                    "linear-gradient(180deg, hsl(0 0% 4%) 0%, hsl(0 0% 2%) 100%)",
                                  borderColor: "hsl(220 10% 12%)",
                                }
                              : undefined
                        }
                        onClick={() => {
                          if (race.id) setSelectedRaceId(race.id);
                        }}
                        whileHover={{ x: 4 }}
                      >
                        {user && isAdmin && (
                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                              onClick={(e) => handleSetLiveLink(race, e)}
                              aria-label={`Editar link da live: ${race.name}`}
                              title="Editar link da live"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => openDelete(race, e)}
                              aria-label={`Apagar: ${race.name}`}
                              title="Apagar corrida"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {(() => {
                          const positions = race.id ? racePositions[race.id] : [];
                          const hasPositions = positions && positions.length > 0;
                          
                          // Fallback to race.position_finished if no positions found
                          const fallbackPosition = race.position_finished;
                          
                          if (hasPositions || fallbackPosition) {
                            const hasMultiple = hasPositions && positions.length > 1;
                            
                            return (
                              <div className={`absolute top-4 right-4 z-10 ${hasMultiple ? 'flex flex-row flex-wrap gap-3 justify-end' : 'flex flex-col gap-2 items-end'}`}>
                                {hasPositions ? (
                                  positions.map((pos) => {
                                    const isP1 = pos.position_finished === "P1" || pos.position_finished === "1";
                                    const isP2 = pos.position_finished === "P2" || pos.position_finished === "2";
                                    const isP3 = pos.position_finished === "P3" || pos.position_finished === "3";
                                    
                                    return (
                                      <div key={pos.id} className="flex flex-col items-center gap-1.5 min-w-[60px]">
                                        <span
                                          className={`position-badge position-badge-large ${
                                            isP1
                                              ? "p1"
                                              : isP2
                                                ? "p2"
                                                : isP3
                                                  ? "p3"
                                                  : "bg-secondary"
                                          }`}
                                        >
                                          {pos.position_finished}
                                        </span>
                                        <span
                                          className={`text-xs sm:text-sm font-racing uppercase tracking-wider text-center whitespace-nowrap font-semibold ${!categoryColors[pos.category] ? "text-muted-foreground" : ""}`}
                                          style={
                                            categoryColors[pos.category]
                                              ? { color: categoryColors[pos.category] }
                                              : undefined
                                          }
                                        >
                                          {pos.category}
                                        </span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="flex flex-col items-center gap-1.5">
                                    <span
                                      className={`position-badge position-badge-large ${
                                        fallbackPosition === "P1" ||
                                        fallbackPosition === "1"
                                          ? "p1"
                                          : fallbackPosition === "P2" ||
                                              fallbackPosition === "2"
                                            ? "p2"
                                            : fallbackPosition === "P3" ||
                                                fallbackPosition === "3"
                                              ? "p3"
                                              : "bg-secondary"
                                      }`}
                                    >
                                      {fallbackPosition}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="p-6">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {formatDate(race.date)}
                          </div>
                          <h3 className="font-racing text-lg font-bold mb-2">
                            {race.name}
                          </h3>
                          {race.track && (
                            <div className="flex items-center gap-2 mt-3">
                              <Trophy className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="text-xs font-racing uppercase tracking-wider text-muted-foreground">
                                {race.track}
                              </span>
                            </div>
                          )}
                          {(race.category || race.split) && (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {race.category && (
                                <span className="text-xs font-racing uppercase tracking-wider text-muted-foreground">
                                  {race.category}
                                </span>
                              )}
                              {race.split && (
                                <span className="text-xs font-racing uppercase tracking-wider text-muted-foreground">
                                  {race.split}
                                </span>
                              )}
                            </div>
                          )}
                          {race.replay_url && (
                            <a
                              href={race.replay_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-racing uppercase tracking-wider"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <PlayCircle className="h-4 w-4" />
                              Ver corrida
                            </a>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <Dialog
              open={selectedRaceId !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedRaceId(null);
                }
              }}
            >
              <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-racing text-2xl">
                    {races.find((r) => r.id === selectedRaceId)?.name || "Eventos da Corrida"}
                  </DialogTitle>
                </DialogHeader>
                {selectedRaceId && (
                  <RaceEventsList
                    raceId={selectedRaceId}
                    driverGroups={
                      (races.find((r) => r.id === selectedRaceId)?.driver_groups as
                        | Record<string, string[]>
                        | null) ?? null
                    }
                  />
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-racing">
              Apagar corrida?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres apagar esta corrida do palmarés? Esta ação não pode ser revertida.
              {raceToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  "{raceToDelete.name}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
