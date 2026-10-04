import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { RaceEventCard } from "./RaceEventCard";
import { Loader2, Radio, RefreshCcw } from "lucide-react";
import { useEventTypes } from "@/hooks/queries/useEventTypes";
import { useDrivers } from "@/hooks/queries/useDrivers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/useAuth";

export function RaceEventsList({ raceId, driverGroups }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isLivePage = location.pathname === "/" || location.pathname === "/live";

  const teamNames = useMemo(() => {
    if (!driverGroups || typeof driverGroups !== "object") return [];
    return Object.keys(driverGroups);
  }, [driverGroups]);
  const teamMode = teamNames.length > 0;
  const driverGroupsKey = useMemo(
    () => JSON.stringify(driverGroups ?? null),
    [driverGroups],
  );

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const { data: eventTypes = [] } = useEventTypes();
  const { data: drivers = [] } = useDrivers();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const resolvedTeam = useMemo(() => {
    if (!teamMode || teamNames.length === 0) return "";
    return teamNames.includes(selectedTeam) ? selectedTeam : teamNames[0];
  }, [teamMode, teamNames, selectedTeam]);
  const [spin, setSpin] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    lap: "",
    description: "",
    event_type: "other",
    position: "",
    driver: "",
    clip_url: "",
    category: "GERAL",
  });

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([getCategories(), fetchEvents()]);
    };
    loadData();

    // Set up realtime subscription
    if (!raceId) {
      return;
    }

    const channel = supabase
      .channel(`race_events_changes:${raceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "race_events",
          filter: `race_id=eq.${raceId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEvents((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setEvents((prev) => prev.filter((e) => e.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setEvents((prev) =>
              prev.map((e) => (e.id === payload.new.id ? payload.new : e)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId]);

  // Auto-select category when categories change; on live page persist selection via URL (sem agrupamentos por equipa)
  useEffect(() => {
    if (teamMode) return;
    if (categories.length > 0) {
      if (isLivePage) {
        const fromUrl = searchParams.get("category");
        const valid = categories.some((c) => c.name === fromUrl);
        const toSet = valid && fromUrl ? fromUrl : categories[0].name;
        setSelectedCategory(toSet);
        setSearchParams({ category: toSet }, { replace: true });
      } else {
        setSelectedCategory(categories[0].name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync from URL when categories load
  }, [categories, isLivePage, teamMode]);

  // Com agrupamentos: filtro por equipa; na live persiste ?team=
  useEffect(() => {
    if (!teamMode || teamNames.length === 0) return;
    if (isLivePage) {
      const fromUrl = searchParams.get("team");
      const valid = fromUrl && teamNames.includes(fromUrl);
      const toSet = valid && fromUrl ? fromUrl : teamNames[0];
      setSelectedTeam(toSet);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete("category");
          p.set("team", toSet);
          return p;
        },
        { replace: true },
      );
    } else {
      setSelectedTeam((prev) =>
        teamNames.includes(prev) ? prev : teamNames[0],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when equipas change / first load
  }, [teamMode, driverGroupsKey, isLivePage]);

  const getCategories = async () => {
    // If we have a raceId, get categories only from drivers in this race
    if (raceId) {
      // First, get the race to find which drivers are participating
      const { data: raceData } = await supabase
        .from("races")
        .select("drivers")
        .eq("id", raceId)
        .single();

      if (raceData && raceData.drivers && raceData.drivers.length > 0) {
        // Get the drivers for this race
        const { data: driversData } = await supabase
          .from("drivers")
          .select("category")
          .in("id", raceData.drivers);

        if (driversData) {
          // Get unique categories from these drivers
          const uniqueCategories = [
            ...new Set(driversData.map((d) => d.category).filter(Boolean)),
          ];
          // Fetch full category data for these categories
          const { data: categoriesData, error } = await supabase
            .from("categories")
            .select("*")
            .in("name", uniqueCategories)
            .neq("name", "GERAL");

          if (error) {
            console.error("Error fetching categories:", error);
            return;
          }

          if (categoriesData && categoriesData.length > 0) {
            setCategories(categoriesData);
          }
          return;
        }
      }
    }

    // Fallback: get all categories if no raceId or no drivers found
    const { data, error } = await supabase.from("categories").select("*");

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    if (data) {
      const filteredCategories = data.filter(
        (category) => category.name !== "GERAL",
      );
      setCategories(filteredCategories);
    }
  };

  const fetchEvents = async () => {
    // If no raceId, don't fetch any events
    if (!raceId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("race_events")
      .select("*")
      .eq("race_id", raceId)
      .order("lap", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEvents(data);
    } else {
      setEvents([]);
    }
    setLoading(false);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEditForm({
      lap: event.lap.toString(),
      description: event.description,
      event_type: event.event_type,
      position: event.position || "",
      driver: event.driver || "",
      clip_url: event.clip_url || "",
      category: event.category || "GERAL",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("race_events")
      .update({
        lap: parseInt(editForm.lap),
        description: editForm.description,
        event_type: editForm.event_type,
        position: editForm.position ? editForm.position.toUpperCase() : null,
        driver: editForm.driver || null,
        clip_url: editForm.clip_url || null,
        category: editForm.category || null,
      })
      .eq("id", editingEvent.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } else {
      toast({ title: "Ocorrência atualizada!" });
      setEditDialogOpen(false);
      setEditingEvent(null);
    }
  };

  // Filter drivers by selected category (or all if GERAL)
  const filteredDrivers = useMemo(() => {
    if (editForm.category === "GERAL" || !editForm.category) {
      return drivers;
    }
    return drivers.filter((driver) => driver.category === editForm.category);
  }, [drivers, editForm.category]);

  // Nomes de piloto da equipa selecionada (event.driver guarda o nome)
  const selectedTeamDriverNames = useMemo(() => {
    if (!teamMode || !resolvedTeam || !driverGroups) return new Set();
    const ids = driverGroups[resolvedTeam] ?? [];
    const names = new Set();
    for (const id of ids) {
      const d = drivers.find((dr) => dr.id === id);
      if (d) {
        names.add(d.name);
        if (d.known_as) names.add(d.known_as);
      }
    }
    return names;
  }, [teamMode, resolvedTeam, driverGroups, drivers]);

  // Por equipa: GERAL + ocorrências cujo piloto pertence à equipa. Senão: categoria + GERAL.
  const filteredEvents = useMemo(() => {
    if (teamMode && resolvedTeam) {
      return events.filter((event) => {
        if (event.category === "GERAL") return true;
        if (event.driver && selectedTeamDriverNames.has(event.driver))
          return true;
        return false;
      });
    }
    return events.filter(
      (event) =>
        event.category === selectedCategory || event.category === "GERAL",
    );
  }, [
    events,
    teamMode,
    resolvedTeam,
    selectedCategory,
    selectedTeamDriverNames,
  ]);

  const showFilterSelect = teamMode
    ? teamNames.length > 0
    : categories.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card-racing p-8 text-center">
        <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-racing text-lg mb-2">Sem ocorrências</h3>
        <p className="text-sm text-muted-foreground">
          As ocorrências da corrida aparecerão aqui em tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-racing uppercase tracking-wider text-muted-foreground">
            Live Feed
          </span>
        </div>
        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchEvents();
              setSpin((s) => s + 360);
            }}
            className={`h-10 w-10 shrink-0 ${showFilterSelect ? "rounded-r-none border-r-0" : ""}`}
          >
            <motion.span
              animate={{ rotate: spin }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="inline-flex"
            >
              <RefreshCcw className="h-4 w-4" />
            </motion.span>
          </Button>
          {showFilterSelect && teamMode && (
            <Select
              value={resolvedTeam}
              onValueChange={(value) => {
                setSelectedTeam(value);
                if (isLivePage) {
                  setSearchParams(
                    (prev) => {
                      const p = new URLSearchParams(prev);
                      p.delete("category");
                      p.set("team", value);
                      return p;
                    },
                    { replace: true },
                  );
                }
              }}
            >
              <SelectTrigger
                aria-label="Filtrar por equipa"
                className="h-10 min-w-[11rem] max-w-[min(18rem,55vw)] shrink-0 rounded-l-none border-l-0 border-border bg-card/80 pl-3 pr-2 font-racing text-xs uppercase tracking-wider text-foreground shadow-none transition-colors hover:bg-card focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 focus:ring-offset-background data-[state=open]:border-primary/40"
              >
                <SelectValue placeholder="Equipa" />
              </SelectTrigger>
              <SelectContent className="font-racing text-xs uppercase tracking-wider">
                {teamNames.map((name) => (
                  <SelectItem
                    key={name}
                    value={name}
                    className="focus:bg-primary/15 focus:text-foreground"
                  >
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showFilterSelect && !teamMode && (
            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value);
                if (isLivePage)
                  setSearchParams({ category: value }, { replace: true });
              }}
            >
              <SelectTrigger
                aria-label="Filtrar por categoria"
                className="h-10 w-[140px] shrink-0 rounded-l-none border-l-0 border-border bg-card/80 pl-3 pr-2 font-racing text-xs uppercase tracking-wider text-foreground shadow-none transition-colors hover:bg-card focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 focus:ring-offset-background data-[state=open]:border-primary/40"
              >
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="font-racing text-xs uppercase tracking-wider">
                {categories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={category.name}
                    className="focus:bg-primary/15 focus:text-foreground"
                  >
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      {filteredEvents.length === 0 ? (
        <div className="card-racing p-8 text-center">
          <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-racing text-lg mb-2">Sem ocorrências</h3>
          <p className="text-sm text-muted-foreground">
            {teamMode
              ? "Não há eventos para a equipa selecionada."
              : "Não há eventos para a categoria selecionada."}
          </p>
        </div>
      ) : (
        filteredEvents.map((event, index) => (
          <RaceEventCard
            key={event.id}
            event={event}
            index={index}
            onEdit={handleEditEvent}
          />
        ))
      )}

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing">Editar Ocorrência</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateEvent} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-lap">Volta</Label>
                <Input
                  id="edit-lap"
                  type="number"
                  placeholder="25"
                  value={editForm.lap}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lap: e.target.value })
                  }
                  required
                  min={1}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoria</Label>
                <Select
                  value={editForm.category || "GERAL"}
                  onValueChange={(v) => {
                    const newCategory = v;
                    // Se mudou a categoria e o driver atual não pertence à nova categoria, limpar driver
                    const currentDriver = drivers.find(
                      (d) => d.name === editForm.driver,
                    );
                    const shouldClearDriver =
                      editForm.driver &&
                      currentDriver &&
                      newCategory !== "GERAL" &&
                      currentDriver.category !== newCategory;
                    setEditForm({
                      ...editForm,
                      category: newCategory,
                      driver: shouldClearDriver ? "" : editForm.driver,
                    });
                  }}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="GERAL">GERAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-event-type">Tipo de Evento</Label>
                <Select
                  value={editForm.event_type}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, event_type: v })
                  }
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.id} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                placeholder="Ultrapassagem na T1 para P6"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                required
                className="bg-secondary min-h-[80px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-position">Posição (opcional)</Label>
                <Input
                  id="edit-position"
                  placeholder="6"
                  value={editForm.position}
                  onChange={(e) =>
                    setEditForm({ ...editForm, position: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-driver">Piloto (opcional)</Label>
                <Select
                  value={editForm.driver}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, driver: value })
                  }
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selecionar piloto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.name}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-clip-url">Link do Clip (opcional)</Label>
              <Input
                id="edit-clip-url"
                type="url"
                placeholder="https://clips.twitch.tv/..."
                value={editForm.clip_url}
                onChange={(e) =>
                  setEditForm({ ...editForm, clip_url: e.target.value })
                }
                className="bg-secondary"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingEvent(null);
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
