import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Map,
  Upload,
  X,
  Flag,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/layout/PageHero";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRaces } from "@/hooks/queries/useRaces";
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
import { RacingLoader } from "@/components/RacingLoader";

const DAY_NAMES_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function formatDateTime(d) {
  try {
    const date = new Date(d);
    return {
      date: date.toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { date: "—", time: "—" };
  }
}

function toDatetimeLocal(d) {
  try {
    const date = new Date(d);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Calendario() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: races = [], isLoading: loading } = useRaces("asc");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRace, setSelectedRace] = useState(null);
  const [form, setForm] = useState({
    name: "",
    track: "",
    dateTime: "",
    tipo: "",
    num_cars: "",
    num_classes: "",
    weather: "",
    drivers: [],
    replay_url: "",
  });

  // Group state for add/edit dialogs
  const [groups, setGroups] = useState([]);

  // Image state for add/edit dialogs
  const [weatherFile, setWeatherFile] = useState(null);
  const [mapFile, setMapFile] = useState(null);
  const [weatherPreview, setWeatherPreview] = useState(null);
  const [mapPreview, setMapPreview] = useState(null);
  const weatherRef = useRef(null);
  const mapRef = useRef(null);

  const resetImageState = () => {
    setWeatherFile(null);
    setMapFile(null);
    setWeatherPreview(null);
    setMapPreview(null);
    if (weatherRef.current) weatherRef.current.value = "";
    if (mapRef.current) mapRef.current.value = "";
  };

  // Calendar view: default to current month
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const goToPrevMonth = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const goToNextMonth = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDate(today);
  };

  // Build calendar grid: array of weeks, each week = array of { date, isCurrentMonth, isToday }
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Leading days from previous month
    const prevMonth = new Date(year, month - 1);
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(
        prevMonth.getFullYear(),
        prevMonth.getMonth(),
        prevMonthDays - i,
      );
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, new Date()),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, new Date()),
      });
    }

    // Trailing days from next month to complete the grid
    const totalCells = Math.ceil(days.length / 7) * 7;
    const nextMonth = new Date(year, month + 1);
    let nextD = 1;
    while (days.length < totalCells) {
      const date = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        nextD,
      );
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
      });
      nextD++;
    }

    return days;
  }, [viewDate]);

  const racesByDate = useMemo(() => {
    const map = {};
    for (const race of races) {
      const d = new Date(race.date);
      const key = formatDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(race);
    }
    return map;
  }, [races]);

  const selectedDateRaces = useMemo(() => {
    if (!selectedDate) return [];
    const key = formatDateKey(selectedDate);
    return racesByDate[key] ?? [];
  }, [selectedDate, racesByDate]);

  const invalidateRaces = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.races.all });

  const openAdd = () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    setForm({
      name: "",
      track: "",
      dateTime: toDatetimeLocal(now.toISOString()),
      tipo: "",
      num_cars: "",
      num_classes: "",
      weather: "",
      drivers: [],
      replay_url: "",
    });
    resetImageState();
    setGroups([]);
    setAddDialogOpen(true);
  };

  const openEdit = (race) => {
    setSelectedRace(race);
    setForm({
      name: race.name,
      track: race.track,
      dateTime: toDatetimeLocal(race.date),
      tipo: race.tipo ?? "",
      num_cars: race.num_cars?.toString() ?? "",
      num_classes: race.num_classes?.toString() ?? "",
      weather: race.weather ?? "",
      drivers: race.drivers ?? [],
      replay_url: race.replay_url ?? "",
    });
    resetImageState();
    // Load existing driver groups
    const existingGroups = race.driver_groups;
    setGroups(
      existingGroups
        ? Object.entries(existingGroups).map(([name, driverIds]) => ({
            name,
            driverIds,
          }))
        : [],
    );
    setEditDialogOpen(true);
  };

  const openDelete = (race) => {
    setSelectedRace(race);
    setDeleteDialogOpen(true);
  };

  const handleSetLive = async (race) => {
    if (!race?.id) return;
    setSubmitting(true);
    await supabase
      .from("races")
      .update({ is_active: false })
      .eq("is_active", true);
    const { error } = await supabase
      .from("races")
      .update({ is_active: true })
      .eq("id", race.id);
    setSubmitting(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } else {
      toast({
        title: "Corrida em direto!",
        description: `${race.name} está agora na página Live.`,
      });
      invalidateRaces();
    }
  };

  const handleSaveTrackInfo = async (raceId) => {
    if (!weatherFile && !mapFile) return;
    try {
      const { saveTrackInfo } = await import("@/lib/saveTrackInfo");
      await saveTrackInfo(raceId, weatherFile, mapFile);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Corrida guardada, mas erro ao carregar imagem",
        description: err.message,
      });
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.tipo) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Seleciona o tipo da corrida.",
      });
      return;
    }
    setSubmitting(true);

    const dateIso = form.dateTime
      ? new Date(form.dateTime).toISOString()
      : new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from("races")
      .insert([
        {
          name: form.name,
          track: form.track,
          date: dateIso,
          is_active: false,
          tipo: form.tipo,
          num_cars: form.num_cars ? parseInt(form.num_cars, 10) : null,
          num_classes: form.num_classes ? parseInt(form.num_classes, 10) : null,
          weather: form.weather || null,
          drivers: form.drivers.length > 0 ? form.drivers : null,
          driver_groups:
            groups.length > 0
              ? Object.fromEntries(groups.map((g) => [g.name, g.driverIds]))
              : null,
        },
      ])
      .select()
      .single();

    if (error) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
      return;
    }

    await handleSaveTrackInfo(inserted.id);

    setSubmitting(false);
    toast({ title: "Corrida adicionada!" });
    setAddDialogOpen(false);
    resetImageState();
    setGroups([]);
    invalidateRaces();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedRace) return;
    setSubmitting(true);

    const dateIso = form.dateTime
      ? new Date(form.dateTime).toISOString()
      : selectedRace.date;

    const { error } = await supabase
      .from("races")
      .update({
        name: form.name,
        track: form.track,
        date: dateIso,
        tipo: form.tipo || null,
        num_cars: form.num_cars ? parseInt(form.num_cars, 10) : null,
        num_classes: form.num_classes ? parseInt(form.num_classes, 10) : null,
        weather: form.weather || null,
        drivers: form.drivers.length > 0 ? form.drivers : null,
        driver_groups:
          groups.length > 0
            ? Object.fromEntries(groups.map((g) => [g.name, g.driverIds]))
            : null,
        replay_url: form.replay_url?.trim() || null,
      })
      .eq("id", selectedRace.id);

    if (!error) {
      await handleSaveTrackInfo(selectedRace.id);
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
      setEditDialogOpen(false);
      resetImageState();
      setGroups([]);
      setSelectedRace(null);
      invalidateRaces();
    }
  };

  const handleDelete = async () => {
    if (!selectedRace) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("races")
      .delete()
      .eq("id", selectedRace.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } else {
      toast({ title: "Corrida removida!" });
      setDeleteDialogOpen(false);
      setSelectedRace(null);
      invalidateRaces();
    }
  };

  return (
    <PageShell>
      <PageHero
        title="Calendário"
        subtitle="Datas e horários das próximas corridas da Ric Team Racing."
      />

      {/* Content */}
      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex justify-end"
            >
              <Button
                onClick={openAdd}
                className="font-racing btn-racing gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Corrida
              </Button>
            </motion.div>
          )}

          {loading ? (
            <RacingLoader className="py-16" />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Calendar header */}
              <div className="flex items-center justify-between">
                <h2 className="font-racing text-xl md:text-2xl font-bold">
                  {MONTH_NAMES_PT[viewDate.getMonth()]} {viewDate.getFullYear()}
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevMonth}
                    className="h-10 w-10 rounded-lg"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToToday}
                    className="font-racing text-sm h-10 px-3 rounded-lg"
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    className="h-10 w-10 rounded-lg"
                    aria-label="Mês seguinte"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Calendar grid */}
              <div className="card-racing overflow-hidden p-2 sm:p-4">
                {/* Day names row */}
                <div className="grid grid-cols-7 gap-px mb-1 sm:mb-2">
                  {DAY_NAMES_PT.map((day) => (
                    <div
                      key={day}
                      className="py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-racing uppercase tracking-wider text-muted-foreground"
                    >
                      <span className="sm:hidden">{day.charAt(0)}</span>
                      <span className="hidden sm:inline">{day}</span>
                    </div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7 gap-px border-t border-border">
                  {calendarDays.map((cell, i) => {
                    const key = formatDateKey(cell.date);
                    const dayRaces = racesByDate[key] ?? [];
                    const hasRaces = dayRaces.length > 0;

                    return (
                      <motion.button
                        key={key}
                        type="button"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.008 }}
                        onClick={() => setSelectedDate(cell.date)}
                        className={`min-h-[44px] sm:min-h-[64px] flex flex-col items-center justify-start pt-1.5 sm:pt-2 text-left transition-colors rounded-md ${
                          !cell.isCurrentMonth
                            ? "text-muted-foreground/60"
                            : "text-foreground hover:bg-secondary/50"
                        } ${
                          selectedDate && isSameDay(cell.date, selectedDate)
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : ""
                        }`}
                      >
                        <span
                          className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-racing tabular-nums ${
                            cell.isToday
                              ? "bg-primary text-primary-foreground font-bold"
                              : ""
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        {hasRaces && (
                          <span className="mt-0.5 sm:mt-1 flex gap-0.5 items-center justify-center">
                            {dayRaces.slice(0, 3).map((r) => (
                              <span
                                key={r.id}
                                className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary shrink-0"
                              />
                            ))}
                            {dayRaces.length > 3 && (
                              <span className="text-[10px] sm:text-xs font-racing text-muted-foreground">
                                +{dayRaces.length - 3}
                              </span>
                            )}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile agenda: upcoming races this month when no day selected */}
              {!selectedDate && (
                <div className="md:hidden space-y-3">
                  <h3 className="font-racing text-sm uppercase tracking-widest text-muted-foreground">
                    Agenda do mês
                  </h3>
                  {Object.entries(racesByDate)
                    .filter(([key]) => {
                      const [y, m] = key.split("-").map(Number);
                      return (
                        y === viewDate.getFullYear() &&
                        m === viewDate.getMonth() + 1
                      );
                    })
                    .sort(([a], [b]) => a.localeCompare(b))
                    .flatMap(([, dayRaces]) => dayRaces).length === 0 ? (
                    <p className="text-muted-foreground text-sm py-2">
                      Sem corridas neste mês.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(racesByDate)
                        .filter(([key]) => {
                          const [y, m] = key.split("-").map(Number);
                          return (
                            y === viewDate.getFullYear() &&
                            m === viewDate.getMonth() + 1
                          );
                        })
                        .sort(([a], [b]) => a.localeCompare(b))
                        .flatMap(([, dayRaces]) => dayRaces)
                        .map((race) => (
                          <RaceCard
                            key={`agenda-${race.id}`}
                            race={race}
                            index={0}
                            isUpcoming={new Date(race.date) >= new Date()}
                            isAdmin={!!user}
                            isActive={race.is_active}
                            onEdit={() => openEdit(race)}
                            onDelete={() => openDelete(race)}
                            onSetLive={() => handleSetLive(race)}
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected day races */}
              <AnimatePresence mode="wait">
                {selectedDate ? (
                  <motion.section
                    key={formatDateKey(selectedDate)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    <h3 className="font-racing text-sm uppercase tracking-widest text-muted-foreground">
                      {selectedDate.toLocaleDateString("pt-PT", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h3>
                    {selectedDateRaces.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4">
                        Sem corridas neste dia.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedDateRaces.map((race) => (
                          <RaceCard
                            key={race.id}
                            race={race}
                            index={0}
                            isUpcoming={new Date(race.date) >= new Date()}
                            isAdmin={!!user}
                            isActive={race.is_active}
                            onEdit={() => openEdit(race)}
                            onDelete={() => openDelete(race)}
                            onSetLive={() => handleSetLive(race)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.section>
                ) : (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-muted-foreground text-sm py-4"
                  >
                    Seleciona um dia para ver as corridas.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing text-xl">
              Adicionar Corrida
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Nome da Corrida</Label>
              <Input
                id="add-name"
                placeholder="24h Daytona 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="bg-secondary font-racing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-track">Pista</Label>
              <Input
                id="add-track"
                placeholder="Daytona International Speedway"
                value={form.track}
                onChange={(e) => setForm({ ...form, track: e.target.value })}
                required
                className="bg-secondary font-racing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-tipo">Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v })}
                required
              >
                <SelectTrigger className="bg-secondary font-racing">
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vsca">VSCA</SelectItem>
                  <SelectItem value="iracing">iRacing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-date">Data e Hora</Label>
                <Input
                  id="add-date"
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) =>
                    setForm({ ...form, dateTime: e.target.value })
                  }
                  required
                  className="bg-secondary font-racing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-weather">Tempo</Label>
                <Select
                  value={form.weather || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, weather: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="bg-secondary font-racing">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="sol">Sol</SelectItem>
                    <SelectItem value="chuva">Chuva</SelectItem>
                    <SelectItem value="nublado">Nublado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-cars">Nº Carros</Label>
                <Input
                  id="add-cars"
                  type="number"
                  min="0"
                  placeholder="Ex: 50"
                  value={form.num_cars}
                  onChange={(e) =>
                    setForm({ ...form, num_cars: e.target.value })
                  }
                  className="bg-secondary font-racing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-classes">Nº Classes</Label>
                <Input
                  id="add-classes"
                  type="number"
                  min="0"
                  placeholder="Ex: 3"
                  value={form.num_classes}
                  onChange={(e) =>
                    setForm({ ...form, num_classes: e.target.value })
                  }
                  className="bg-secondary font-racing"
                />
              </div>
            </div>
            <MultiSelectDrivers
              selectedIds={form.drivers}
              onChange={(ids) => setForm({ ...form, drivers: ids })}
              label="Pilotos a Participar"
            />

            {/* Driver groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Agrupamentos de Equipa{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() =>
                    setGroups([
                      ...groups,
                      { name: `Equipa ${groups.length + 1}`, driverIds: [] },
                    ])
                  }
                >
                  <Plus className="h-3 w-3" />
                  Adicionar grupo
                </Button>
              </div>
              {groups.map((group, gi) => {
                const usedByOthers = groups
                  .filter((_, i) => i !== gi)
                  .flatMap((g) => g.driverIds);
                const available = form.drivers.filter(
                  (id) => !usedByOthers.includes(id),
                );
                return (
                  <div
                    key={gi}
                    className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={group.name}
                        onChange={(e) => {
                          const u = [...groups];
                          u[gi] = { ...group, name: e.target.value };
                          setGroups(u);
                        }}
                        className="bg-background h-8 text-sm font-racing"
                        placeholder="Nome da equipa"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setGroups(groups.filter((_, i) => i !== gi))
                        }
                        className="rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <MultiSelectDrivers
                      selectedIds={group.driverIds}
                      onChange={(ids) => {
                        const u = [...groups];
                        u[gi] = { ...group, driverIds: ids };
                        setGroups(u);
                      }}
                      filterIds={[...available, ...group.driverIds]}
                      label="Pilotos deste grupo"
                    />
                  </div>
                );
              })}
              {groups.length > 0 && form.drivers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Seleciona primeiro os pilotos a participar.
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Weather image */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-primary" />
                  Previsão do Tempo{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <input
                  ref={weatherRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setWeatherFile(f);
                      setWeatherPreview(URL.createObjectURL(f));
                    }
                  }}
                />

                {weatherPreview ? (
                  <div className="relative">
                    <img
                      src={weatherPreview}
                      alt="Previsão do tempo"
                      className="w-full rounded-lg object-cover max-h-36"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setWeatherFile(null);
                        setWeatherPreview(null);
                        if (weatherRef.current) weatherRef.current.value = "";
                      }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed"
                    onClick={() => weatherRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Carregar imagem
                  </Button>
                )}
              </div>
              {/* Track map */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Map className="h-3.5 w-3.5 text-primary" />
                  Mapa da Pista{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <input
                  ref={mapRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setMapFile(f);
                      setMapPreview(URL.createObjectURL(f));
                    }
                  }}
                />

                {mapPreview ? (
                  <div className="relative">
                    <img
                      src={mapPreview}
                      alt="Mapa da pista"
                      className="w-full rounded-lg object-cover max-h-36"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMapFile(null);
                        setMapPreview(null);
                        if (mapRef.current) mapRef.current.value = "";
                      }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed"
                    onClick={() => mapRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Carregar imagem
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="font-racing"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing text-xl">
              Editar Corrida
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Corrida</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="bg-secondary font-racing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-track">Pista</Label>
              <Input
                id="edit-track"
                value={form.track}
                onChange={(e) => setForm({ ...form, track: e.target.value })}
                required
                className="bg-secondary font-racing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tipo">Tipo</Label>
              <Select
                value={form.tipo || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, tipo: v === "none" ? "" : v })
                }
              >
                <SelectTrigger className="bg-secondary font-racing">
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="vsca">VSCA</SelectItem>
                  <SelectItem value="iracing">iRacing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Data e Hora</Label>
                <Input
                  id="edit-date"
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) =>
                    setForm({ ...form, dateTime: e.target.value })
                  }
                  required
                  className="bg-secondary font-racing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weather">Tempo</Label>
                <Select
                  value={form.weather || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, weather: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="bg-secondary font-racing">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="sol">Sol</SelectItem>
                    <SelectItem value="chuva">Chuva</SelectItem>
                    <SelectItem value="nublado">Nublado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-cars">Nº Carros</Label>
                <Input
                  id="edit-cars"
                  type="number"
                  min="0"
                  value={form.num_cars}
                  onChange={(e) =>
                    setForm({ ...form, num_cars: e.target.value })
                  }
                  className="bg-secondary font-racing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-classes">Nº Classes</Label>
                <Input
                  id="edit-classes"
                  type="number"
                  min="0"
                  value={form.num_classes}
                  onChange={(e) =>
                    setForm({ ...form, num_classes: e.target.value })
                  }
                  className="bg-secondary font-racing"
                />
              </div>
            </div>
            <MultiSelectDrivers
              selectedIds={form.drivers}
              onChange={(ids) => setForm({ ...form, drivers: ids })}
              label="Pilotos a Participar"
            />

            <div className="space-y-2">
              <Label htmlFor="edit-replay">
                Link do vídeo da corrida{" "}
                <span className="text-xs text-muted-foreground">
                  (opcional, ex. YouTube)
                </span>
              </Label>
              <Input
                id="edit-replay"
                type="url"
                placeholder="https://www.youtube.com/..."
                value={form.replay_url}
                onChange={(e) =>
                  setForm({ ...form, replay_url: e.target.value })
                }
                className="bg-secondary font-racing"
              />
            </div>
            {/* Driver groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Agrupamentos de Equipa{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() =>
                    setGroups([
                      ...groups,
                      { name: `Equipa ${groups.length + 1}`, driverIds: [] },
                    ])
                  }
                >
                  <Plus className="h-3 w-3" />
                  Adicionar grupo
                </Button>
              </div>
              {groups.map((group, gi) => {
                const usedByOthers = groups
                  .filter((_, i) => i !== gi)
                  .flatMap((g) => g.driverIds);
                const available = form.drivers.filter(
                  (id) => !usedByOthers.includes(id),
                );
                return (
                  <div
                    key={gi}
                    className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={group.name}
                        onChange={(e) => {
                          const u = [...groups];
                          u[gi] = { ...group, name: e.target.value };
                          setGroups(u);
                        }}
                        className="bg-background h-8 text-sm font-racing"
                        placeholder="Nome da equipa"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setGroups(groups.filter((_, i) => i !== gi))
                        }
                        className="rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <MultiSelectDrivers
                      selectedIds={group.driverIds}
                      onChange={(ids) => {
                        const u = [...groups];
                        u[gi] = { ...group, driverIds: ids };
                        setGroups(u);
                      }}
                      filterIds={[...available, ...group.driverIds]}
                      label="Pilotos deste grupo"
                    />
                  </div>
                );
              })}
              {groups.length > 0 && form.drivers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Seleciona primeiro os pilotos a participar.
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Weather image */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-primary" />
                  Previsão do Tempo{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <input
                  ref={weatherRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setWeatherFile(f);
                      setWeatherPreview(URL.createObjectURL(f));
                    }
                  }}
                />

                {weatherPreview ? (
                  <div className="relative">
                    <img
                      src={weatherPreview}
                      alt="Previsão do tempo"
                      className="w-full rounded-lg object-cover max-h-36"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setWeatherFile(null);
                        setWeatherPreview(null);
                        if (weatherRef.current) weatherRef.current.value = "";
                      }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed"
                    onClick={() => weatherRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Carregar imagem
                  </Button>
                )}
              </div>
              {/* Track map */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Map className="h-3.5 w-3.5 text-primary" />
                  Mapa da Pista{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <input
                  ref={mapRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setMapFile(f);
                      setMapPreview(URL.createObjectURL(f));
                    }
                  }}
                />

                {mapPreview ? (
                  <div className="relative">
                    <img
                      src={mapPreview}
                      alt="Mapa da pista"
                      className="w-full rounded-lg object-cover max-h-36"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMapFile(null);
                        setMapPreview(null);
                        if (mapRef.current) mapRef.current.value = "";
                      }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed"
                    onClick={() => mapRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Carregar imagem
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="font-racing"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-racing text-xl text-destructive">
              Eliminar corrida
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tens a certeza que queres eliminar "{selectedRace?.name}"? Esta ação
            não pode ser revertida.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              className="font-racing"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function RaceCard({
  race,
  index,
  isUpcoming,
  isAdmin,
  isActive,
  onEdit,
  onDelete,
  onSetLive,
}) {
  const { date, time } = formatDateTime(race.date);

  return (
    <motion.div
      layout
      variants={item}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className={`card-racing overflow-hidden group relative ${
        isUpcoming
          ? "border-l-4 border-l-primary"
          : "opacity-75 hover:opacity-90 border-l-4 border-l-muted"
      } ${isActive ? "ring-2 ring-red-500/50" : ""}`}
    >
      <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="font-racing uppercase tracking-wider">{date}</span>
            <span className="text-muted-foreground/70">•</span>
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="font-racing uppercase tracking-wider">{time}</span>
            {isActive && (
              <span className="text-red-500 font-semibold uppercase tracking-wider ml-1">
                Em direto
              </span>
            )}
          </div>
          <h3 className="font-racing text-lg font-bold mb-1 truncate">
            {race.name}
          </h3>
          {race.track && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="font-racing uppercase tracking-wider truncate">
                {race.track}
              </span>
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            {onSetLive && !isActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSetLive}
                className="h-10 w-10 rounded-full hover:bg-red-500/20 hover:text-red-500"
                aria-label="Colocar em live"
                title="Colocar em live"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-10 w-10 rounded-full"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-10 w-10 rounded-full hover:bg-destructive/20 hover:text-destructive"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
