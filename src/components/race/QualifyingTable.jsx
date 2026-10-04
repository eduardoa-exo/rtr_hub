import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Timer, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDrivers } from "@/hooks/queries/useDrivers";

export function QualifyingTable({ raceId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: drivers = [] } = useDrivers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState(null);
  const [form, setForm] = useState({
    driver_id: "",
    position: "",
    lap_time: "",
  });

  const fetchResults = async () => {
    // If no raceId, don't fetch any results
    if (!raceId) {
      setResults([]);
      setLoading(false);
      return;
    }

    const { data: resultsData, error: resultsError } = await supabase
      .from("qualifying_results")
      .select("*")
      .eq("race_id", raceId)
      .order("position", { ascending: true });
    if (resultsError || !resultsData) {
      setResults([]);
      setLoading(false);
      return;
    }

    const driverIds = [...new Set(resultsData.map((r) => r.driver_id))].filter(
      Boolean,
    );

    const driversMap = new Map(drivers.map((driver) => [driver.id, driver]));
    const resultsWithDrivers = resultsData.map((result) => ({
      ...result,
      driver:
        driverIds.length > 0 ? driversMap.get(result.driver_id) : undefined,
    }));

    setResults(resultsWithDrivers);
    setLoading(false);
  };

  useEffect(() => {
    fetchResults();
  }, [raceId, drivers]);

  const openAdd = () => {
    setEditingResult(null);
    setForm({
      driver_id: "",
      position: "",
      lap_time: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (result) => {
    setEditingResult(result);
    setForm({
      driver_id: result.driver_id || "",
      position: result.position?.toString() || "",
      lap_time: result.lap_time || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!raceId) {
      toast({
        title: "Erro",
        description: "ID da corrida não encontrado.",
        variant: "destructive",
      });
      return;
    }
    if (!form.driver_id || !form.position) {
      toast({
        title: "Campos em falta",
        description: "Preenche o piloto e a posição.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    const position = parseInt(form.position, 10);
    if (isNaN(position)) {
      toast({
        title: "Posição inválida",
        description: "A posição deve ser um número.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    if (editingResult) {
      const { error } = await supabase
        .from("qualifying_results")
        .update({
          driver_id: form.driver_id,
          position: position,
          lap_time: form.lap_time.trim() || null,
        })
        .eq("id", editingResult.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Resultado atualizado!" });
        closeDialog();
        fetchResults();
      }
    } else {
      const { error } = await supabase.from("qualifying_results").insert({
        race_id: raceId,
        driver_id: form.driver_id,
        position: position,
        lap_time: form.lap_time.trim() || null,
      });

      if (error) {
        toast({
          title: "Erro ao adicionar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Resultado adicionado!" });
        closeDialog();
        fetchResults();
      }
    }
    setSubmitting(false);
  };

  const openDelete = (result) => {
    setResultToDelete(result);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!resultToDelete) return;

    const { error } = await supabase
      .from("qualifying_results")
      .delete()
      .eq("id", resultToDelete.id);

    if (error) {
      toast({
        title: "Erro ao apagar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Resultado apagado!" });
      fetchResults();
    }

    setDeleteDialogOpen(false);
    setResultToDelete(null);
  };

  function renderDialogs() {
    return (
      <>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => !open && closeDialog()}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-racing">
                {editingResult ? "Editar resultado" : "Adicionar resultado"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="driver">Piloto</Label>
                <Select
                  value={form.driver_id}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, driver_id: value }))
                  }
                >
                  <SelectTrigger id="driver" className="mt-1.5">
                    <SelectValue placeholder="Selecionar piloto" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="position">Posição</Label>
                <Input
                  id="position"
                  value={form.position}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, position: e.target.value }))
                  }
                  placeholder="Ex.: 1, 2, DNF"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="lap_time">Tempo de volta</Label>
                <Input
                  id="lap_time"
                  value={form.lap_time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lap_time: e.target.value }))
                  }
                  placeholder="Ex.: 1:23.456"
                  className="mt-1.5"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {editingResult ? "Guardar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-racing">
                Apagar resultado?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tens a certeza que queres apagar este resultado? Esta ação não
                pode ser revertida.
                {resultToDelete && (
                  <span className="block mt-2 font-medium text-foreground">
                    {resultToDelete.driver?.name} - P{resultToDelete.position}
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
      </>
    );
  }

  const dialogs = renderDialogs();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {results.length === 0 ? (
        <div className="card-racing p-6 text-center">
          <Timer className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            Sem resultados de qualificação
          </p>
          {user && raceId && (
            <Button onClick={openAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar resultado
            </Button>
          )}
        </div>
      ) : (
        <div className="card-racing overflow-hidden border-l-4 border-l-primary/40 bg-primary/[0.04]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-racing text-sm uppercase tracking-wider">
              Qualificação
            </h3>
            {user && raceId && (
              <Button
                onClick={openAdd}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            )}
          </div>
          <div className="divide-y divide-border">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors group"
              >
                <span
                  className={`position-badge ${
                    result.position === 1
                      ? "p1"
                      : result.position === 2
                        ? "p2"
                        : result.position === 3
                          ? "p3"
                          : "bg-secondary"
                  }`}
                >
                  P{result.position}
                </span>
                <div className="flex-1">
                  <p className="font-racing text-sm text-muted-foreground">
                    {result.driver?.name || "—"}
                  </p>
                </div>
                <p className="font-racing text-sm text-muted-foreground">
                  {result.driver?.category || "—"}
                </p>
                <p className="font-racing text-sm text-muted-foreground">
                  {result.lap_time || "—"}
                </p>
                {user && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => openEdit(result)}
                      aria-label={`Editar: ${result.driver?.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => openDelete(result)}
                      aria-label={`Apagar: ${result.driver?.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {dialogs}
    </>
  );
}
