import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Flag, Clock, Car, Layers, Cloud, Sun, CloudRain, Edit, Loader2, Map, Upload, X, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { RaceEventsList } from "@/components/race/RaceEventsList";
import { QualifyingTable } from "@/components/race/QualifyingTable";
import { TrackInfo } from "@/components/race/TrackInfo";
import { RaceDrivers } from "@/components/race/RaceDrivers";
import { Countdown } from "@/components/race/Countdown";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveRace } from "@/hooks/queries/useActiveRace";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectDrivers } from "@/components/ui/multi-select-drivers";
import type { Database } from "@/integrations/supabase/types";

type Race = Database["public"]["Tables"]["races"]["Row"] & {
  duration_hours?: number | null;
  drivers?: string[] | null;
};

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: raceData, isLoading: loading } = useActiveRace();
  const activeRace = raceData?.activeRace ?? null;
  const nextRace = raceData?.nextRace ?? null;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    track: "",
    num_cars: "",
    num_classes: "",
    weather: "",
    duration_hours: "",
    duration_minutes: "",
    drivers: [] as string[],
  });
  const [editGroups, setEditGroups] = useState<{ name: string; driverIds: string[] }[]>([]);
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [weatherPreview, setWeatherPreview] = useState<string | null>(null);
  const [mapPreview, setMapPreview] = useState<string | null>(null);
  const weatherRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLInputElement>(null);
  const formattedDuration = useMemo(() => {
    if (!activeRace?.duration_hours) return "—";
    const hours = Math.floor(activeRace.duration_hours);
    const minutes = Math.round((activeRace.duration_hours - hours) * 60);
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }, [activeRace?.duration_hours]);

  // Corrida usada para mostrar info de pista:
  // se houver corrida ativa, usa essa; caso contrário, usa a próxima corrida
  const trackInfoRaceId = activeRace?.id ?? nextRace?.id;

  const invalidateActiveRace = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.races.active() });

  const openEditDialog = () => {
    if (!activeRace) return;
    const totalHours = activeRace.duration_hours || 0;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    
    setEditForm({
      name: activeRace.name,
      track: activeRace.track,
      num_cars: activeRace.num_cars?.toString() || "",
      num_classes: activeRace.num_classes?.toString() || "",
      weather: activeRace.weather || "",
      duration_hours: hours > 0 ? hours.toString() : "",
      duration_minutes: minutes > 0 ? minutes.toString() : "",
      drivers: (activeRace.drivers ?? []) as string[],
    });
    setWeatherFile(null);
    setMapFile(null);
    setWeatherPreview(null);
    setMapPreview(null);
    if (weatherRef.current) weatherRef.current.value = "";
    if (mapRef.current) mapRef.current.value = "";
    const existingGroups = activeRace.driver_groups as Record<string, string[]> | null;
    setEditGroups(
      existingGroups
        ? Object.entries(existingGroups).map(([name, driverIds]) => ({ name, driverIds }))
        : []
    );
    setEditDialogOpen(true);
  };

  const handleUpdateRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRace) return;

    setSubmitting(true);

    const hours = editForm.duration_hours ? parseInt(editForm.duration_hours, 10) : 0;
    const minutes = editForm.duration_minutes ? parseInt(editForm.duration_minutes, 10) : 0;
    const totalHours = hours + (minutes / 60);

    const updateData = {
      name: editForm.name,
      track: editForm.track,
      num_cars: editForm.num_cars ? parseInt(editForm.num_cars, 10) : null,
      num_classes: editForm.num_classes ? parseInt(editForm.num_classes, 10) : null,
      weather: editForm.weather || null,
      duration_hours: totalHours > 0 ? totalHours : null,
      drivers: editForm.drivers.length > 0 ? editForm.drivers : null,
      driver_groups: editGroups.length > 0
        ? Object.fromEntries(editGroups.map((g) => [g.name, g.driverIds]))
        : null,
    };

    const { data, error } = await supabase
      .from("races")
      .update(updateData)
      .eq("id", activeRace.id)
      .select()
      .single();

    if (!error && (weatherFile || mapFile)) {
      try {
        const { saveTrackInfo } = await import("@/lib/saveTrackInfo");
        await saveTrackInfo(activeRace.id, weatherFile, mapFile);
      } catch (imgErr: any) {
        toast({
          variant: "destructive",
          title: "Corrida guardada, mas erro ao carregar imagem",
          description: imgErr.message,
        });
      }
    }

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } else {
      toast({ title: "Corrida atualizada!" });
      invalidateActiveRace();
      setEditDialogOpen(false);
    }
  };

  return (
    <PageShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 page-hero-wash" />
        <div className="container py-10 md:py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <p className="mb-3 text-xs font-racing uppercase tracking-widest text-racing-red">
              {activeRace ? "Corrida em Direto" : "Próxima Corrida"}
            </p>

            <h1 className="font-racing text-2xl sm:text-4xl md:text-5xl font-bold mb-3 tracking-tight">
              {activeRace ? activeRace.name : nextRace?.name ?? "Sem corrida agendada"}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              {activeRace
                ? activeRace.track
                : nextRace?.track
                  ? nextRace.track
                  : "Acompanha em tempo real as ocorrências das corridas da RTR no iRacing."}
            </p>

            {/* Countdown for next race (when no active race) */}
            {!activeRace && nextRace && nextRace.date && (
              <Countdown targetDate={nextRace.date} raceName={nextRace.name} />
            )}

            {activeRace && (
              <div className="relative inline-flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 px-5 sm:px-8 py-4 rounded-2xl bg-card/50 backdrop-blur-md border border-border/50 w-full sm:w-auto text-left">
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-card border border-border hover:bg-primary/20"
                    onClick={openEditDialog}
                    title="Editar corrida"
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </Button>
                )}
                <div className="text-left">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Estado</p>
                  <p className="font-racing font-bold text-racing-red">Ao vivo</p>
                </div>
                <div className="hidden sm:block h-8 w-px bg-border" />
                <div className="text-left">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pista</p>
                  <p className="font-racing font-bold">{activeRace.track}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Stats Bar — below first viewport */}
      <section className="border-b border-border bg-card/50">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * 0 }}
              className="text-center"
            >
              <Car className="h-7 w-7 mx-auto mb-2 text-primary" />
              <p className="font-racing text-2xl font-bold">{activeRace?.num_cars ?? "—"}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Carros</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * 1 }}
              className="text-center"
            >
              <Layers className="h-7 w-7 mx-auto mb-2 text-primary" />
              <p className="font-racing text-2xl font-bold">{activeRace?.num_classes ?? "—"}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {activeRace?.num_classes === 1 ? "Classe" : "Classes"}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * 2 }}
              className="text-center"
            >
              <Clock className="h-7 w-7 mx-auto mb-2 text-primary" />
              <p className="font-racing text-2xl font-bold">
                {formattedDuration}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Duração</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * 3 }}
              className="text-center"
            >
              {activeRace?.weather ? (
                (() => {
                  const WeatherIcon =
                    activeRace.weather === "sol"
                      ? Sun
                      : activeRace.weather === "chuva"
                        ? CloudRain
                        : Cloud;
                  return <WeatherIcon className="h-7 w-7 mx-auto mb-2 text-primary" />;
                })()
              ) : (
                <Cloud className="h-7 w-7 mx-auto mb-2 text-primary" />
              )}
              {activeRace?.weather ? (
                <p className="font-racing text-2xl font-bold capitalize">
                  {activeRace.weather}
                </p>
              ) : (
                <p className="font-racing text-2xl font-bold">—</p>
              )}
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Metereologia</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Race Events Feed */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-racing text-xl uppercase tracking-wider">
                <Flag className="inline-block h-5 w-5 mr-2 text-primary" />
                Race Highlights
              </h2>
            </div>
            <RaceEventsList
              raceId={activeRace?.id}
              driverGroups={
                (activeRace?.driver_groups as Record<string, string[]> | null) ?? null
              }
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <QualifyingTable raceId={activeRace?.id} />
            <RaceDrivers
              driverIds={activeRace?.drivers}
              driverGroups={activeRace?.driver_groups as Record<string, string[]> | null}
            />
            <TrackInfo raceId={trackInfoRaceId} />
          </div>
        </div>
      </main>

      {/* Edit Race Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing">Editar Corrida</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRace} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-race-name">Nome da Corrida</Label>
                <Input
                  id="edit-race-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-race-track">Pista</Label>
                <Input
                  id="edit-race-track"
                  value={editForm.track}
                  onChange={(e) =>
                    setEditForm({ ...editForm, track: e.target.value })
                  }
                  required
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-num-cars">Número de Carros</Label>
                <Input
                  id="edit-num-cars"
                  type="number"
                  min="0"
                  value={editForm.num_cars}
                  onChange={(e) =>
                    setEditForm({ ...editForm, num_cars: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-num-classes">Número de Classes</Label>
                <Input
                  id="edit-num-classes"
                  type="number"
                  min="0"
                  value={editForm.num_classes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, num_classes: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-weather">Tempo</Label>
                <Select
                  value={editForm.weather}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, weather: value })
                  }
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selecionar tempo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sol">Sol</SelectItem>
                    <SelectItem value="chuva">Chuva</SelectItem>
                    <SelectItem value="nublado">Nublado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-duration-hours">Duração - Horas</Label>
                <Input
                  id="edit-duration-hours"
                  type="number"
                  min="0"
                  max="99"
                  placeholder="ex: 2, 6, 24"
                  value={editForm.duration_hours}
                  onChange={(e) =>
                    setEditForm({ ...editForm, duration_hours: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-duration-minutes">Duração - Minutos</Label>
                <Input
                  id="edit-duration-minutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="ex: 0, 30, 45"
                  value={editForm.duration_minutes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, duration_minutes: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
            </div>
            <MultiSelectDrivers
              selectedIds={editForm.drivers}
              onChange={(ids) => setEditForm({ ...editForm, drivers: ids })}
              label="Pilotos a Participar"
            />
            {/* Driver groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Agrupamentos de Equipa <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setEditGroups([...editGroups, { name: `Equipa ${editGroups.length + 1}`, driverIds: [] }])}
                >
                  <Plus className="h-3 w-3" />
                  Adicionar grupo
                </Button>
              </div>
              {editGroups.map((group, gi) => {
                const usedByOthers = editGroups.filter((_, i) => i !== gi).flatMap((g) => g.driverIds);
                const available = editForm.drivers.filter((id) => !usedByOthers.includes(id));
                return (
                  <div key={gi} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={group.name}
                        onChange={(e) => { const u = [...editGroups]; u[gi] = { ...group, name: e.target.value }; setEditGroups(u); }}
                        className="bg-background h-8 text-sm font-racing"
                        placeholder="Nome da equipa"
                      />
                      <button type="button" onClick={() => setEditGroups(editGroups.filter((_, i) => i !== gi))}
                        className="rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <MultiSelectDrivers
                      selectedIds={group.driverIds}
                      onChange={(ids) => { const u = [...editGroups]; u[gi] = { ...group, driverIds: ids }; setEditGroups(u); }}
                      filterIds={[...available, ...group.driverIds]}
                      label="Pilotos deste grupo"
                    />
                  </div>
                );
              })}
              {editGroups.length > 0 && editForm.drivers.length === 0 && (
                <p className="text-xs text-muted-foreground">Seleciona primeiro os pilotos a participar.</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Weather image */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-primary" />
                  Previsão do Tempo <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <input ref={weatherRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setWeatherFile(f); setWeatherPreview(URL.createObjectURL(f)); }
                  }}
                />
                {weatherPreview ? (
                  <div className="relative">
                    <img src={weatherPreview} alt="Previsão do tempo" className="w-full rounded-lg object-cover max-h-36" />
                    <button type="button"
                      onClick={() => { setWeatherFile(null); setWeatherPreview(null); if (weatherRef.current) weatherRef.current.value = ""; }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 hover:bg-black">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => weatherRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Carregar imagem
                  </Button>
                )}
              </div>
              {/* Track map */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Map className="h-3.5 w-3.5 text-primary" />
                  Mapa da Pista <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <input ref={mapRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setMapFile(f); setMapPreview(URL.createObjectURL(f)); }
                  }}
                />
                {mapPreview ? (
                  <div className="relative">
                    <img src={mapPreview} alt="Mapa da pista" className="w-full rounded-lg object-cover max-h-36" />
                    <button type="button"
                      onClick={() => { setMapFile(null); setMapPreview(null); if (mapRef.current) mapRef.current.value = ""; }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 hover:bg-black">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => mapRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Carregar imagem
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default Index;
