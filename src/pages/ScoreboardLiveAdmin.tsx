import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Trophy, Save, X } from "lucide-react";
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

interface ScoreboardConfig {
  id: number;
  enabled: boolean;
  title: string;
  intro: string | null;
  championship_class: "LMP2" | "GT3 PRO" | "BOTH";
  focus_car_number: string | null;
  rival_car_numbers: string[];
  updated_at: string;
}

export default function ScoreboardLiveAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<ScoreboardConfig | null>(null);
  const [availableCarNumbers, setAvailableCarNumbers] = useState<string[]>([]);
  const [rivalInput, setRivalInput] = useState("");

  const [configForm, setConfigForm] = useState({
    enabled: false,
    title: "Scoreboard Live",
    intro: "",
    championship_class: "BOTH" as "LMP2" | "GT3 PRO" | "BOTH",
    focus_car_number: "",
    rival_car_numbers: [] as string[],
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
          championship_class: configData.championship_class,
          focus_car_number: configData.focus_car_number || "",
          rival_car_numbers: configData.rival_car_numbers,
        });
      }

      const { data: standings, error: standingsError } = await supabase
        .from("championship_standings")
        .select("car_number, class")
        .order("rank", { ascending: true });

      if (!standingsError && standings) {
        const uniqueCarNumbers = Array.from(
          new Set(standings.map((s) => s.car_number))
        ).sort();
        setAvailableCarNumbers(uniqueCarNumbers);
      }
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

  const handleAddRival = () => {
    const trimmed = rivalInput.trim();
    if (trimmed && !configForm.rival_car_numbers.includes(trimmed)) {
      setConfigForm({
        ...configForm,
        rival_car_numbers: [...configForm.rival_car_numbers, trimmed],
      });
      setRivalInput("");
    }
  };

  const handleRemoveRival = (carNumber: string) => {
    setConfigForm({
      ...configForm,
      rival_car_numbers: configForm.rival_car_numbers.filter((r) => r !== carNumber),
    });
  };

  const handleSaveConfig = async () => {
    setSubmitting(true);

    try {
      const trimmedTitle = configForm.title.trim();
      const trimmedIntro = configForm.intro.trim();

      if (!trimmedTitle || trimmedTitle.length === 0) {
        toast({
          title: "Erro",
          description: "O título não pode estar vazio.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      if (trimmedTitle.length > 80) {
        toast({
          title: "Erro",
          description: "O título não pode ter mais de 80 caracteres.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      if (trimmedIntro.length > 500) {
        toast({
          title: "Erro",
          description: "A introdução não pode ter mais de 500 caracteres.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      if (configForm.enabled && !configForm.focus_car_number) {
        toast({
          title: "Erro",
          description: "Selecione o carro a acompanhar (focus).",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      if (configForm.enabled && configForm.rival_car_numbers.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um carro rival.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const configData = {
        id: 1,
        enabled: configForm.enabled,
        title: trimmedTitle,
        intro: trimmedIntro || null,
        championship_class: configForm.championship_class,
        focus_car_number: configForm.focus_car_number || null,
        rival_car_numbers: configForm.rival_car_numbers,
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
                <h2 className="font-racing text-lg mb-4">Configuração</h2>
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
                    <Label htmlFor="title">
                      Título
                      <span className="text-xs text-muted-foreground ml-2">
                        ({configForm.title.length}/80)
                      </span>
                    </Label>
                    <Input
                      id="title"
                      value={configForm.title}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, title: e.target.value })
                      }
                      placeholder="Scoreboard Live"
                      className="bg-secondary"
                      maxLength={80}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="intro">
                      Introdução (opcional)
                      <span className="text-xs text-muted-foreground ml-2">
                        ({configForm.intro.length}/500)
                      </span>
                    </Label>
                    <Textarea
                      id="intro"
                      value={configForm.intro}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, intro: e.target.value })
                      }
                      placeholder="Texto de introdução para a página..."
                      className="bg-secondary min-h-[100px]"
                      maxLength={500}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class">Classe do Campeonato</Label>
                    <Select
                      value={configForm.championship_class}
                      onValueChange={(value) =>
                        setConfigForm({
                          ...configForm,
                          championship_class: value as "LMP2" | "GT3 PRO" | "BOTH",
                        })
                      }
                    >
                      <SelectTrigger id="class" className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LMP2">LMP2</SelectItem>
                        <SelectItem value="GT3 PRO">GT3 PRO</SelectItem>
                        <SelectItem value="BOTH">Ambas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="focus">
                      Carro a Acompanhar (Focus)
                    </Label>
                    {availableCarNumbers.length > 0 ? (
                      <Select
                        value={configForm.focus_car_number}
                        onValueChange={(value) =>
                          setConfigForm({
                            ...configForm,
                            focus_car_number: value,
                          })
                        }
                      >
                        <SelectTrigger id="focus" className="bg-secondary">
                          <SelectValue placeholder="Selecione o carro" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCarNumbers.map((carNumber) => (
                            <SelectItem key={carNumber} value={carNumber}>
                              #{carNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="focus"
                        value={configForm.focus_car_number}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            focus_car_number: e.target.value,
                          })
                        }
                        placeholder="Ex: 87"
                        className="bg-secondary"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rivals">Carros Rivais</Label>
                    <div className="flex gap-2">
                      {availableCarNumbers.length > 0 ? (
                        <Select
                          value={rivalInput}
                          onValueChange={(value) => {
                            setRivalInput(value);
                            const trimmed = value.trim();
                            if (trimmed && !configForm.rival_car_numbers.includes(trimmed)) {
                              setConfigForm({
                                ...configForm,
                                rival_car_numbers: [...configForm.rival_car_numbers, trimmed],
                              });
                              setRivalInput("");
                            }
                          }}
                        >
                          <SelectTrigger id="rivals" className="bg-secondary flex-1">
                            <SelectValue placeholder="Adicionar rival" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCarNumbers
                              .filter((cn) => !configForm.rival_car_numbers.includes(cn) && cn !== configForm.focus_car_number)
                              .map((carNumber) => (
                                <SelectItem key={carNumber} value={carNumber}>
                                  #{carNumber}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <>
                          <Input
                            id="rivals"
                            value={rivalInput}
                            onChange={(e) => setRivalInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddRival();
                              }
                            }}
                            placeholder="Ex: 63"
                            className="bg-secondary flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleAddRival}
                            variant="outline"
                          >
                            Adicionar
                          </Button>
                        </>
                      )}
                    </div>
                    {configForm.rival_car_numbers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {configForm.rival_car_numbers.map((carNumber) => (
                          <div
                            key={carNumber}
                            className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md"
                          >
                            <span className="text-sm">#{carNumber}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRival(carNumber)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
