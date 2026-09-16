import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, GripVertical, Loader2, Trophy, Save } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ScoreboardConfig {
  id: number;
  enabled: boolean;
  title: string;
  intro: string | null;
  updated_at: string;
}

interface ScoreboardLine {
  id: string;
  sort_order: number;
  condition_label: string;
  result_label: string;
  result_variant: "win" | "lose" | "neutral";
  visible: boolean;
}

interface LineForm {
  condition_label: string;
  result_label: string;
  result_variant: "win" | "lose" | "neutral";
  visible: boolean;
}

export default function ScoreboardLiveAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<ScoreboardConfig | null>(null);
  const [lines, setLines] = useState<ScoreboardLine[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineToDelete, setLineToDelete] = useState<ScoreboardLine | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [configForm, setConfigForm] = useState({
    enabled: false,
    title: "Scoreboard Live",
    intro: "",
  });

  const [lineForm, setLineForm] = useState<LineForm>({
    condition_label: "",
    result_label: "",
    result_variant: "neutral",
    visible: true,
  });

  useEffect(() => {
    if (authLoading || adminLoading) return;

    if (!user || !isAdmin) {
      return;
    }

    fetchData();
  }, [user, isAdmin, authLoading, adminLoading]);

  const fetchData = async () => {
    try {
      const { data: configData, error: configError } = await supabase
        .from("scoreboard_live_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (configError && configError.code !== "PGRST116" && configError.code !== "42P01") {
        throw configError;
      }

      if (configData) {
        setConfig(configData);
        setConfigForm({
          enabled: configData.enabled,
          title: configData.title,
          intro: configData.intro || "",
        });
      }

      const { data: linesData, error: linesError } = await supabase
        .from("scoreboard_live_lines")
        .select("*")
        .order("sort_order", { ascending: true });

      if (linesError && linesError.code !== "42P01") {
        throw linesError;
      }

      setLines(linesData || []);
    } catch (error) {
      console.error("Error fetching scoreboard data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "As tabelas podem ainda não estar criadas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSubmitting(true);

    try {
      const configData = {
        id: 1,
        enabled: configForm.enabled,
        title: configForm.title || "Scoreboard Live",
        intro: configForm.intro || null,
      };

      const { error } = await supabase
        .from("scoreboard_live_config")
        .upsert(configData);

      if (error) throw error;

      toast({ title: "Configuração guardada!" });
      await fetchData();
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast({
        title: "Erro ao guardar configuração",
        description: error.message || "Tabela pode não existir ainda.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lineForm.condition_label.trim() || !lineForm.result_label.trim()) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (editingLineId) {
        const { error } = await supabase
          .from("scoreboard_live_lines")
          .update({
            condition_label: lineForm.condition_label,
            result_label: lineForm.result_label,
            result_variant: lineForm.result_variant,
            visible: lineForm.visible,
          })
          .eq("id", editingLineId);

        if (error) throw error;

        toast({ title: "Linha atualizada!" });
      } else {
        const maxOrder =
          lines.length > 0 ? Math.max(...lines.map((l) => l.sort_order)) : 0;

        const { error } = await supabase
          .from("scoreboard_live_lines")
          .insert([
            {
              sort_order: maxOrder + 1,
              condition_label: lineForm.condition_label,
              result_label: lineForm.result_label,
              result_variant: lineForm.result_variant,
              visible: lineForm.visible,
            },
          ]);

        if (error) throw error;

        toast({ title: "Linha adicionada!" });
      }

      setEditingLineId(null);
      setLineForm({
        condition_label: "",
        result_label: "",
        result_variant: "neutral",
        visible: true,
      });

      await fetchData();
    } catch (error: any) {
      console.error("Error saving line:", error);
      toast({
        title: "Erro ao guardar linha",
        description: error.message || "Tabela pode não existir ainda.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditLine = (line: ScoreboardLine) => {
    setEditingLineId(line.id);
    setLineForm({
      condition_label: line.condition_label,
      result_label: line.result_label,
      result_variant: line.result_variant,
      visible: line.visible,
    });
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setLineForm({
      condition_label: "",
      result_label: "",
      result_variant: "neutral",
      visible: true,
    });
  };

  const handleDeleteLine = async () => {
    if (!lineToDelete) return;

    try {
      const { error } = await supabase
        .from("scoreboard_live_lines")
        .delete()
        .eq("id", lineToDelete.id);

      if (error) throw error;

      toast({ title: "Linha removida!" });
      setDeleteDialogOpen(false);
      setLineToDelete(null);
      await fetchData();
    } catch (error: any) {
      console.error("Error deleting line:", error);
      toast({
        title: "Erro ao remover linha",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (lineId: string, direction: "up" | "down") => {
    const currentIndex = lines.findIndex((l) => l.id === lineId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= lines.length) return;

    const newLines = [...lines];
    [newLines[currentIndex], newLines[targetIndex]] = [
      newLines[targetIndex],
      newLines[currentIndex],
    ];

    setLines(newLines);

    try {
      const updates = newLines.map((line, index) =>
        supabase
          .from("scoreboard_live_lines")
          .update({ sort_order: index + 1 })
          .eq("id", line.id)
      );

      await Promise.all(updates);

      toast({ title: "Ordem atualizada!" });
    } catch (error: any) {
      console.error("Error reordering lines:", error);
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
      await fetchData();
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="page-shell">
      <Header />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-8"
        >
          <div>
            <h1 className="font-racing text-2xl sm:text-3xl font-bold mb-2">
              <Trophy className="inline-block h-6 w-6 mr-2 text-primary" />
              Scoreboard Live - Admin
            </h1>
            <p className="text-muted-foreground">
              Gerir cenários de título para a última corrida
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="card-racing p-4 sm:p-6">
                <h2 className="font-racing text-lg mb-4">Configuração Geral</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enabled" className="text-base">
                        Ativo
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar link no navbar e permitir acesso público
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={configForm.enabled}
                      onCheckedChange={(checked) =>
                        setConfigForm({ ...configForm, enabled: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={configForm.title}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, title: e.target.value })
                      }
                      placeholder="Scoreboard Live"
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="intro">Introdução (opcional)</Label>
                    <Textarea
                      id="intro"
                      value={configForm.intro}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, intro: e.target.value })
                      }
                      placeholder="Texto de introdução para a página..."
                      className="bg-secondary min-h-[100px]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveConfig}
                      disabled={submitting}
                      className="gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Guardar Configuração
                    </Button>
                  </div>
                </div>
              </div>

              <div className="card-racing p-4 sm:p-6">
                <h2 className="font-racing text-lg mb-4">
                  {editingLineId ? "Editar Linha" : "Adicionar Linha"}
                </h2>
                <form onSubmit={handleSaveLine} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condição</Label>
                    <Input
                      id="condition"
                      value={lineForm.condition_label}
                      onChange={(e) =>
                        setLineForm({
                          ...lineForm,
                          condition_label: e.target.value,
                        })
                      }
                      placeholder="Ex: Se o piloto A vencer..."
                      className="bg-secondary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="result">Resultado</Label>
                    <Input
                      id="result"
                      value={lineForm.result_label}
                      onChange={(e) =>
                        setLineForm({
                          ...lineForm,
                          result_label: e.target.value,
                        })
                      }
                      placeholder="Ex: Piloto A é campeão"
                      className="bg-secondary"
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variant">Variante</Label>
                      <Select
                        value={lineForm.result_variant}
                        onValueChange={(value) =>
                          setLineForm({
                            ...lineForm,
                            result_variant: value as "win" | "lose" | "neutral",
                          })
                        }
                      >
                        <SelectTrigger id="variant" className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="win">Vitória (Verde)</SelectItem>
                          <SelectItem value="lose">Derrota (Vermelho)</SelectItem>
                          <SelectItem value="neutral">Neutro (Azul)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="visible">Visibilidade</Label>
                      <div className="flex items-center h-10 px-3 rounded-md border border-input bg-secondary">
                        <Switch
                          id="visible"
                          checked={lineForm.visible}
                          onCheckedChange={(checked) =>
                            setLineForm({ ...lineForm, visible: checked })
                          }
                        />
                        <span className="ml-2 text-sm">
                          {lineForm.visible ? "Visível" : "Oculto"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {editingLineId && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : editingLineId ? (
                        "Atualizar Linha"
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Linha
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              <div className="card-racing p-4 sm:p-6">
                <h2 className="font-racing text-lg mb-4">Linhas Existentes</h2>
                {lines.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma linha criada ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lines.map((line, index) => (
                      <div
                        key={line.id}
                        className={`flex items-start gap-2 p-3 rounded-lg border ${
                          line.visible
                            ? "border-border bg-secondary/50"
                            : "border-border/50 bg-secondary/20 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col gap-1 pt-1">
                          <button
                            onClick={() => handleReorder(line.id, "up")}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReorder(line.id, "down")}
                            disabled={index === lines.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-muted-foreground mb-1">
                            {line.condition_label}
                          </div>
                          <div className="font-medium">{line.result_label}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                line.result_variant === "win"
                                  ? "bg-green-500/20 text-green-400"
                                  : line.result_variant === "lose"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              {line.result_variant === "win"
                                ? "Vitória"
                                : line.result_variant === "lose"
                                ? "Derrota"
                                : "Neutro"}
                            </span>
                            {!line.visible && (
                              <span className="text-xs text-muted-foreground">
                                (Oculto)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditLine(line)}
                            className="h-8 w-8"
                          >
                            <span className="text-xs">✏️</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setLineToDelete(line);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta linha? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLine}
              className="bg-destructive"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
