import { useEffect, useRef, useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { uploadMedia } from "@/lib/r2Upload";
import { useStandings } from "@/hooks/queries/useStandings";
import { queryKeys } from "@/hooks/queries/queryKeys";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RacingLoader } from "@/components/RacingLoader";
import * as Flags from "country-flag-icons/react/3x2";
import { parsePdfToStandings, type ParsedStanding } from "@/utils/pdfParser";

interface Standing {
  id: string;
  class: string;
  rank: number;
  car_number: string;
  car_logo_url: string | null;
  country_code: string;
  team_name: string;
  points: number;
  behind: number;
  starts: number;
  poles: number;
  wins: number;
  top5: number;
  top10: number;
}

interface StandingForm {
  class: string;
  rank: string;
  car_number: string;
  country_code: string;
  team_name: string;
  car_logo_url: string;
  points: string;
  behind: string;
  starts: string;
  poles: string;
  wins: string;
  top5: string;
  top10: string;
}

const COUNTRIES = [
  { code: "PT", name: "Portugal" },
  { code: "US", name: "United States" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "BR", name: "Brazil" },
  { code: "CU", name: "Cuba" },
  { code: "NL", name: "Netherlands" },
];

// Car brands that should have inverted colors (white logos)
const INVERTED_BRANDS = ["mclaren", "acura", "aston"];

// Helper function to check if a logo URL should be inverted
const shouldInvertLogo = (logoUrl: string | null): boolean => {
  if (!logoUrl) return false;
  const lowerUrl = logoUrl.toLowerCase();
  return INVERTED_BRANDS.some(brand => lowerUrl.includes(brand));
};

const FLAG_COMPONENTS = Flags as Record<string, ComponentType<{ className?: string }>>;
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
  EN: "GB",
  USA: "US",
};

const isRicTeamRacing = (teamName: string) =>
  teamName.trim().toLowerCase() === "ric team racing";

const renderFlag = (countryCode?: string | null) => {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }
  const resolved = COUNTRY_CODE_ALIASES[normalized] ?? normalized;
  const Flag = FLAG_COMPONENTS[resolved];
  if (!Flag) {
    return <span className="text-xs">{resolved}</span>;
  }
  return <Flag className="h-4 w-6 rounded-sm" />;
};

const recomputeRanks = async (className: "LMP2" | "GT3 PRO") => {
  const { data, error } = await supabase
    .from("championship_standings")
    .select("id, points")
    .eq("class", className);

  if (error || !data) {
    return { error };
  }

  const sorted = [...data].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.id.localeCompare(b.id);
  });

  const leaderPoints = sorted[0]?.points ?? 0;

  const updateResults = await Promise.all(
    sorted.map((item, index) =>
      supabase
        .from("championship_standings")
        .update({
          rank: index + 1,
          behind: item.points - leaderPoints,
        })
        .eq("id", item.id)
    )
  );

  const updateError = updateResults.find((result) => result.error)?.error;
  return { error: updateError };
};

export default function Classificacao() {
  const pointsInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedClass, setSelectedClass] = useState<"LMP2" | "GT3 PRO">("GT3 PRO");
  const queryClient = useQueryClient();
  const { data: standings = [], isLoading: loading } = useStandings(selectedClass);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStanding, setEditingStanding] = useState<Standing | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [standingToDelete, setStandingToDelete] = useState<Standing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // PDF Import states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedStanding[]>([]);
  const [importClass, setImportClass] = useState<"LMP2" | "GT3 PRO">("GT3 PRO");
  const [parsingPdf, setParsingPdf] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<StandingForm>({
    class: "GT3 PRO",
    rank: "",
    car_number: "",
    country_code: "PT",
    team_name: "",
    car_logo_url: "",
    points: "0",
    behind: "0",
    starts: "0",
    poles: "0",
    wins: "0",
    top5: "0",
    top10: "0",
  });

  const invalidateStandings = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.standings.all });

  useEffect(() => {
    if (dialogOpen) {
      requestAnimationFrame(() => {
        pointsInputRef.current?.focus();
      });
    }
  }, [dialogOpen]);

  const openAdd = () => {
    setEditingStanding(null);
    setForm({
      class: selectedClass,
      rank: "",
      car_number: "",
      country_code: "PT",
      team_name: "",
      car_logo_url: "",
      points: "0",
      behind: "0",
      starts: "0",
      poles: "0",
      wins: "0",
      top5: "0",
      top10: "0",
    });
    setDialogOpen(true);
  };

  const openEdit = (standing: Standing) => {
    setEditingStanding(standing);
    setForm({
      class: standing.class,
      rank: standing.rank.toString(),
      car_number: standing.car_number,
      country_code: standing.country_code,
      team_name: standing.team_name,
      car_logo_url: standing.car_logo_url || "",
      points: standing.points.toString(),
      behind: standing.behind.toString(),
      starts: standing.starts.toString(),
      poles: standing.poles.toString(),
      wins: standing.wins.toString(),
      top5: standing.top5.toString(),
      top10: standing.top10.toString(),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingStanding(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Apenas imagens são permitidas.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter menos de 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Não autenticado");
      }

      // Use standing ID or car number as entity ID
      const entityId = editingStanding?.id || form.car_number;

      const { publicUrl } = await uploadMedia({
        file,
        type: "championship",
        authToken: session.access_token,
        entityId,
      });

      setForm({ ...form, car_logo_url: publicUrl });
      setUploadingImage(false);
      toast({ title: "Imagem carregada!" });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Validation
    if (!form.team_name.trim() || !form.car_number.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const standingData = {
      class: form.class,
      rank: 0,
      car_number: form.car_number,
      country_code: form.country_code,
      team_name: form.team_name,
      car_logo_url: form.car_logo_url || null,
      points: parseInt(form.points) || 0,
      behind: parseInt(form.behind) || 0,
      starts: parseInt(form.starts) || 0,
      poles: parseInt(form.poles) || 0,
      wins: parseInt(form.wins) || 0,
      top5: parseInt(form.top5) || 0,
      top10: parseInt(form.top10) || 0,
    };

    if (editingStanding) {
      // Update existing standing
      const { error } = await supabase
        .from("championship_standings")
        .update(standingData)
        .eq("id", editingStanding.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await recomputeRanks(form.class as "LMP2" | "GT3 PRO");
        toast({ title: "Classificação atualizada!" });
        closeDialog();
        invalidateStandings();
      }
    } else {
      // Create new standing
      const { error } = await supabase
        .from("championship_standings")
        .insert([standingData]);

      if (error) {
        toast({
          title: "Erro ao adicionar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await recomputeRanks(form.class as "LMP2" | "GT3 PRO");
        toast({ title: "Classificação adicionada!" });
        closeDialog();
        invalidateStandings();
      }
    }

    setSubmitting(false);
  };

  const openDelete = (standing: Standing) => {
    setStandingToDelete(standing);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!standingToDelete) return;
    const classToRecompute = standingToDelete.class as "LMP2" | "GT3 PRO";

    // R2 files will remain but are orphaned (cleanup can be done separately)

    // Delete from database
    const { error } = await supabase
      .from("championship_standings")
      .delete()
      .eq("id", standingToDelete.id);

    if (error) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await recomputeRanks(classToRecompute);
      toast({ title: "Classificação removida!" });
      setDeleteDialogOpen(false);
      setStandingToDelete(null);
      invalidateStandings();
    }
  };

  // PDF Import handlers
  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({
        title: "Erro",
        description: "Apenas ficheiros PDF são permitidos.",
        variant: "destructive",
      });
      return;
    }

    setParsingPdf(true);

    try {
      const result = await parsePdfToStandings(file);
      
      if (result.standings.length === 0) {
        throw new Error("Nenhuma classificação encontrada no PDF");
      }

      setParsedData(result.standings);
      
      // Set detected class or default to current selected
      if (result.detectedClass) {
        setImportClass(result.detectedClass);
      } else {
        setImportClass(selectedClass);
      }

      toast({
        title: "PDF processado com sucesso!",
        description: `${result.standings.length} equipas encontradas.`,
      });
    } catch (error) {
      console.error("PDF parsing error:", error);
      toast({
        title: "Erro ao processar PDF",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      setParsedData([]);
    } finally {
      setParsingPdf(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum dado para importar.",
        variant: "destructive",
      });
      return;
    }

    setImportingData(true);

    try {
      // Step 1: Get existing standings to preserve country_code and car_logo_url
      const { data: existingStandings, error: fetchError } = await supabase
        .from("championship_standings")
        .select("car_number, country_code, car_logo_url")
        .eq("class", importClass);

      if (fetchError) {
        throw new Error(`Erro ao buscar dados existentes: ${fetchError.message}`);
      }

      // Create a map for quick lookup
      const existingDataMap = new Map(
        (existingStandings || []).map(s => [
          s.car_number,
          { country_code: s.country_code, car_logo_url: s.car_logo_url }
        ])
      );

      // Step 2: Delete all existing standings for this class
      const { error: deleteError } = await supabase
        .from("championship_standings")
        .delete()
        .eq("class", importClass);

      if (deleteError) {
        throw new Error(`Erro ao limpar dados existentes: ${deleteError.message}`);
      }

      // Step 3: Insert new standings, preserving country_code and car_logo_url when available
      const standingsToInsert = parsedData.map((standing) => {
        const existingData = existingDataMap.get(standing.car_number);
        
        return {
          class: importClass,
          rank: 0, // Will be recalculated
          car_number: standing.car_number,
          country_code: existingData?.country_code || "PT", // Preserve or default to PT
          team_name: standing.team_name,
          car_logo_url: existingData?.car_logo_url || null, // Preserve or null
          points: standing.points,
          behind: standing.behind,
          starts: standing.starts,
          poles: standing.poles,
          wins: standing.wins,
          top5: standing.top5,
          top10: standing.top10,
        };
      });

      const { error: insertError } = await supabase
        .from("championship_standings")
        .insert(standingsToInsert);

      if (insertError) {
        throw new Error(`Erro ao inserir dados: ${insertError.message}`);
      }

      // Step 4: Recompute ranks
      await recomputeRanks(importClass);

      // Success!
      const preserved = standingsToInsert.filter(s => s.car_logo_url || s.country_code !== "PT").length;
      toast({
        title: "Importação concluída!",
        description: `${parsedData.length} equipas importadas. ${preserved > 0 ? `${preserved} equipas mantiveram bandeiras/logos.` : ""}`,
      });

      // Reset and close
      setImportDialogOpen(false);
      setParsedData([]);
      
      // Refresh if viewing the imported class
      if (selectedClass === importClass) {
        invalidateStandings();
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setImportingData(false);
    }
  };

  const handleCancelImport = () => {
    setImportDialogOpen(false);
    setParsedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="page-shell">
      <Header />

      {/* Hero Section */}
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
              <span className="text-gradient-racing">Classificação</span>{" "}
              <span className="text-foreground">do Campeonato</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Acompanha a classificação das equipas nas classes LMP2 e GT3 PRO
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-8">
        {/* Class Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="inline-flex rounded-2xl bg-secondary/50 border border-border/40 p-1 backdrop-blur-sm">
            <button
              onClick={() => setSelectedClass("LMP2")}
              className={`font-racing text-sm uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all ${
                selectedClass === "LMP2"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LMP2
            </button>
            <button
              onClick={() => setSelectedClass("GT3 PRO")}
              className={`font-racing text-sm uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all ${
                selectedClass === "GT3 PRO"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GT3 PRO
            </button>
          </div>
        </div>

        {/* Add Team Button (Admin Only) */}
        {user && (
          <div className="flex justify-end gap-2 mb-4">
            <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar PDF
            </Button>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Equipa
            </Button>
          </div>
        )}

        {/* Standings Table */}
        {loading ? (
          <RacingLoader className="py-12" />
        ) : standings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhuma equipa na classificação de {selectedClass}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="min-w-full"
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      No.
                    </th>
                    <th className="hidden sm:table-cell text-left py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Car
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Team
                    </th>
                    <th className="text-center py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Pts
                    </th>
                    <th className="hidden md:table-cell text-center py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Behind
                    </th>
                    <th className="hidden md:table-cell text-center py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Starts
                    </th>
                    <th className="hidden lg:table-cell text-center py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Poles
                    </th>
                    <th className="hidden lg:table-cell text-center py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Wins
                    </th>
                    <th className="hidden lg:table-cell text-center py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Top 5
                    </th>
                    <th className="hidden lg:table-cell text-center py-3 px-3 text-xs font-racing uppercase tracking-wider">
                      Top 10
                    </th>
                    {user && <th className="w-16 sm:w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {standings.map((standing, index) => {
                      const homeTeam = isRicTeamRacing(standing.team_name);
                      return (
                      <motion.tr
                        key={standing.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border-b border-border group ${
                          homeTeam
                            ? "relative bg-accent/50 border-l-2 border-l-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)] hover:from-primary/16 hover:via-primary/10"
                            : "hover:bg-accent/50"
                        } ${user ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (user) openEdit(standing);
                        }}
                      >
                        <td className="py-3 px-3">
                          <span className="font-bold">{standing.rank}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-primary rounded">
                            {standing.car_number}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell py-3 px-3">
                          {standing.car_logo_url ? (
                            <img
                              src={standing.car_logo_url}
                              alt="Car logo"
                              loading="lazy"
                              decoding="async"
                              className={`h-8 w-8 object-contain ${
                                shouldInvertLogo(standing.car_logo_url)
                                  ? "brightness-0 invert"
                                  : ""
                              }`}
                            />
                          ) : (
                            <div className="h-8 w-8 bg-muted rounded" />
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="hidden sm:inline-flex items-center">
                              {renderFlag(standing.country_code)}
                            </span>
                            <span className="text-sm">{standing.team_name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-3 font-bold text-sm">
                          {standing.points}
                        </td>
                        <td className="hidden md:table-cell text-center py-3 px-3 text-sm">
                          {standing.behind}
                        </td>
                        <td className="hidden md:table-cell text-center py-3 px-3 text-sm">
                          {standing.starts}
                        </td>
                        <td className="hidden lg:table-cell text-center py-3 px-3 text-sm">
                          {standing.poles}
                        </td>
                        <td className="hidden lg:table-cell text-center py-3 px-3 text-sm">
                          {standing.wins}
                        </td>
                        <td className="hidden lg:table-cell text-center py-3 px-3 text-sm">
                          {standing.top5}
                        </td>
                        <td className="hidden lg:table-cell text-center py-3 px-3 text-sm">
                          {standing.top10}
                        </td>
                        {user && (
                          <td className="py-3 px-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(standing);
                                }}
                                className="h-9 w-9"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDelete(standing);
                                }}
                                className="h-9 w-9 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </motion.div>
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStanding ? "Editar Equipa" : "Adicionar Equipa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="class">Classe</Label>
                <Select
                  value={form.class}
                  onValueChange={(value) => setForm({ ...form, class: value })}
                  disabled={!!editingStanding}
                >
                  <SelectTrigger id="class">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LMP2">LMP2</SelectItem>
                    <SelectItem value="GT3 PRO">GT3 PRO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rank">Posição (auto)</Label>
                <Input
                  id="rank"
                  type="number"
                  value={form.rank}
                  placeholder="Calculada pelos pontos"
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="car_number">Número do Carro</Label>
                <Input
                  id="car_number"
                  value={form.car_number}
                  onChange={(e) =>
                    setForm({ ...form, car_number: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="country">País</Label>
                <Select
                  value={form.country_code}
                  onValueChange={(value) =>
                    setForm({ ...form, country_code: value })
                  }
                >
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="inline-flex items-center gap-2">
                            {renderFlag(country.code)}
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="team_name">Nome da Equipa</Label>
              <Input
                id="team_name"
                value={form.team_name}
                onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="car_logo">Logo do Carro (Opcional)</Label>
              <Input
                id="car_logo"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <p className="text-sm text-muted-foreground mt-1">
                  A carregar imagem...
                </p>
              )}
              {form.car_logo_url && (
                <img
                  src={form.car_logo_url}
                  alt="Preview"
                  className="mt-2 h-16 w-16 object-contain border rounded"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="points">Pontos</Label>
                <Input
                  id="points"
                  ref={pointsInputRef}
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="behind">Behind</Label>
                <Input
                  id="behind"
                  type="number"
                  value={form.behind}
                  onChange={(e) => setForm({ ...form, behind: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="starts">Starts</Label>
                <Input
                  id="starts"
                  type="number"
                  value={form.starts}
                  onChange={(e) => setForm({ ...form, starts: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="poles">Poles</Label>
                <Input
                  id="poles"
                  type="number"
                  value={form.poles}
                  onChange={(e) => setForm({ ...form, poles: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="wins">Wins</Label>
                <Input
                  id="wins"
                  type="number"
                  value={form.wins}
                  onChange={(e) => setForm({ ...form, wins: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="top5">Top 5</Label>
                <Input
                  id="top5"
                  type="number"
                  value={form.top5}
                  onChange={(e) => setForm({ ...form, top5: e.target.value })}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="top10">Top 10</Label>
                <Input
                  id="top10"
                  type="number"
                  value={form.top10}
                  onChange={(e) => setForm({ ...form, top10: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{standingToDelete?.team_name}</strong> da classificação?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing">Importar Classificação via PDF</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="pdf-file">Selecionar PDF</Label>
              <Input
                id="pdf-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfFileSelect}
                disabled={parsingPdf || importingData}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Selecione o PDF da classificação oficial fornecido pela organização.
              </p>
            </div>

            {/* Loading state */}
            {parsingPdf && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">A processar PDF...</p>
              </div>
            )}

            {/* Preview table */}
            {!parsingPdf && parsedData.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="import-class">Classe</Label>
                  <Select
                    value={importClass}
                    onValueChange={(value) => setImportClass(value as "LMP2" | "GT3 PRO")}
                    disabled={importingData}
                  >
                    <SelectTrigger id="import-class">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LMP2">LMP2</SelectItem>
                      <SelectItem value="GT3 PRO">GT3 PRO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg">
                  <div className="bg-muted px-4 py-3 rounded-t-lg">
                    <h3 className="font-semibold">
                      Preview: {parsedData.length} equipas encontradas
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-sm text-muted-foreground">
                          <th className="text-left py-2 px-4">Rank</th>
                          <th className="text-left py-2 px-4">No.</th>
                          <th className="text-left py-2 px-4">Equipa</th>
                          <th className="text-center py-2 px-4">Pontos</th>
                          <th className="text-center py-2 px-4">Behind</th>
                          <th className="text-center py-2 px-4">Starts</th>
                          <th className="text-center py-2 px-4">Poles</th>
                          <th className="text-center py-2 px-4">Wins</th>
                          <th className="text-center py-2 px-4">Top 5</th>
                          <th className="text-center py-2 px-4">Top 10</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.map((standing, rowIndex) => {
                          const homeTeamPreview = isRicTeamRacing(standing.team_name);
                          return (
                          <tr
                            key={rowIndex}
                            className={`border-b text-sm ${
                              homeTeamPreview
                                ? "bg-primary/10 border-l-2 border-l-primary hover:bg-primary/15"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <td className="py-2 px-4">{standing.rank}</td>
                            <td className="py-2 px-4">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-primary rounded">
                                {standing.car_number}
                              </span>
                            </td>
                            <td className="py-2 px-4">{standing.team_name}</td>
                            <td className="text-center py-2 px-4 font-bold">
                              {standing.points}
                            </td>
                            <td className="text-center py-2 px-4">
                              {standing.behind}
                            </td>
                            <td className="text-center py-2 px-4">
                              {standing.starts}
                            </td>
                            <td className="text-center py-2 px-4">
                              {standing.poles}
                            </td>
                            <td className="text-center py-2 px-4">
                              {standing.wins}
                            </td>
                            <td className="text-center py-2 px-4">
                              {standing.top5}
                            </td>
                            <td className="text-center py-2 px-4">
                              {standing.top10}
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">
                    ℹ️ Informação:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Esta ação irá atualizar os pontos e estatísticas de todas as equipas da classe{" "}
                    <strong>{importClass}</strong>. As bandeiras e logos dos carros já existentes 
                    serão preservados automaticamente (matching por número do carro).
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelImport}
                    disabled={importingData}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={importingData}
                  >
                    {importingData ? "A importar..." : "Confirmar e Importar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
