import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Award,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { uploadMedia } from "@/lib/r2Upload";
import { mediaUrl } from "@/lib/mediaUrl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/layout/PageHero";
import { RacingLoader } from "@/components/RacingLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTrophies } from "@/hooks/queries/useTrophies";
import { useRaces } from "@/hooks/queries/useRaces";
import { queryKeys } from "@/hooks/queries/queryKeys";

const EMPTY_FORM = {
  title: "",
  description: "",
  competition: "",
  position: "",
  date: "",
  image_url: "",
  race_id: "",
};

function formatDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function PositionBadge({ position, size = "normal" }) {
  const p = position?.toUpperCase?.() ?? "";
  const isP1 = p === "P1" || p === "1";
  const isP2 = p === "P2" || p === "2";
  const isP3 = p === "P3" || p === "3";

  const cls =
    size === "large"
      ? "position-badge position-badge-large"
      : "position-badge";

  return (
    <span
      className={`${cls} ${isP1 ? "p1" : isP2 ? "p2" : isP3 ? "p3" : "bg-secondary"}`}
    >
      {position}
    </span>
  );
}

function StatsBar({ trophies }) {
  const counts = useMemo(() => {
    const c = { p2: 0, p3: 0 };
    for (const t of trophies) {
      const p = t.position?.toUpperCase?.() ?? "";
      if (p === "P2" || p === "2") c.p2++;
      else if (p === "P3" || p === "3") c.p3++;
    }
    return c;
  }, [trophies]);

  if (counts.p2 === 0 && counts.p3 === 0) return null;

  return (
    <div className="flex justify-center gap-4 sm:gap-6 mb-10">
      {[
        { count: counts.p2, label: "2º Lugar", color: "p2" },
        { count: counts.p3, label: "3º Lugar", color: "p3" },
      ].map(
        (stat) =>
          stat.count > 0 && (
            <motion.div
              key={stat.color}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-racing px-5 py-4 sm:px-6 sm:py-5 text-center min-w-[90px]"
            >
              <span
                className={`position-badge position-badge-large ${stat.color} mb-2`}
              >
                {stat.count}
              </span>
              <p className="text-xs text-muted-foreground font-racing uppercase tracking-wider mt-2">
                {stat.label}
              </p>
            </motion.div>
          ),
      )}
    </div>
  );
}

export default function Trofeus() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: trophies = [], isLoading: loading } = useTrophies();
  const { data: races = [] } = useRaces("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrophy, setEditingTrophy] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trophyToDelete, setTrophyToDelete] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const invalidateTrophies = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.trophies.all });

  const openAdd = () => {
    setEditingTrophy(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (trophy, e) => {
    e.stopPropagation();
    setEditingTrophy(trophy);
    setForm({
      title: trophy.title,
      description: trophy.description || "",
      competition: trophy.competition || "",
      position: trophy.position,
      date: trophy.date || "",
      image_url: trophy.image_url || "",
      race_id: trophy.race_id || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTrophy(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Apenas imagens são permitidas.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter menos de 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { file: compressed } = await compressImage(file, {
        maxEdge: 1200,
        quality: 0.8,
      });

      const trophyId =
        editingTrophy?.id || `temp-${Math.random().toString(36).substring(2)}`;

      const { publicUrl } = await uploadMedia({
        file: compressed,
        type: "trophy",
        authToken: session.access_token,
        entityId: trophyId,
      });

      setForm((prev) => ({ ...prev, image_url: publicUrl }));
      toast({ title: "Imagem carregada!" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({
        title: "Erro ao processar imagem",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.position.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "O título e a posição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const trophyData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      competition: form.competition.trim() || null,
      position: form.position.trim(),
      date: form.date || null,
      image_url: form.image_url || null,
      race_id: form.race_id || null,
    };

    if (editingTrophy) {
      const { error } = await supabase
        .from("trophies")
        .update(trophyData)
        .eq("id", editingTrophy.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Troféu atualizado!" });
        closeDialog();
        invalidateTrophies();
      }
    } else {
      const { error } = await supabase.from("trophies").insert(trophyData);

      if (error) {
        toast({
          title: "Erro ao adicionar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Troféu adicionado!" });
        closeDialog();
        invalidateTrophies();
      }
    }

    setSubmitting(false);
  };

  const openDelete = (trophy, e) => {
    e.stopPropagation();
    setTrophyToDelete(trophy);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!trophyToDelete) return;

    const { error } = await supabase
      .from("trophies")
      .delete()
      .eq("id", trophyToDelete.id);

    if (error) {
      toast({
        title: "Erro ao apagar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Troféu apagado!" });
      invalidateTrophies();
    }

    setDeleteDialogOpen(false);
    setTrophyToDelete(null);
  };

  return (
    <PageShell>
      <PageHero
        title="Vitrine de Troféus"
        subtitle="Os troféus conquistados pela Ric Team Racing ao longo das temporadas."
      />

      <main className="container py-12">
        {loading ? (
          <RacingLoader className="py-12" />
        ) : trophies.length === 0 ? (
          <div className="card-racing p-12 text-center max-w-lg mx-auto">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-racing text-xl mb-2">Em Construção</h2>
            <p className="text-muted-foreground mb-6">
              A vitrine de troféus será preenchida em breve. Fica atento às
              nossas conquistas!
            </p>
            {user && isAdmin && (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar troféu
              </Button>
            )}
          </div>
        ) : (
          <>
            <StatsBar trophies={trophies} />

            {user && isAdmin && (
              <div className="flex justify-end mb-6 max-w-5xl mx-auto">
                <Button
                  onClick={openAdd}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar troféu
                </Button>
              </div>
            )}

            <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {trophies.map((trophy, index) => (
                <motion.div
                  key={trophy.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: index * 0.04,
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="card-racing group relative overflow-hidden"
                >
                  {user && isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-secondary/80 backdrop-blur-sm"
                        onClick={(e) => openEdit(trophy, e)}
                        aria-label={`Editar ${trophy.title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-secondary/80 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive"
                        onClick={(e) => openDelete(trophy, e)}
                        aria-label={`Apagar ${trophy.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/10 to-secondary overflow-hidden">
                    {trophy.image_url ? (
                      <img
                        src={mediaUrl(trophy.image_url)}
                        alt={trophy.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain cursor-zoom-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxUrl(mediaUrl(trophy.image_url));
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Award className="h-12 w-12 text-primary/30" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3">
                      <PositionBadge
                        position={trophy.position}
                        size="large"
                      />
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-racing text-base font-bold mb-1 line-clamp-2">
                      {trophy.title}
                    </h3>
                    {trophy.competition && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {trophy.competition}
                      </p>
                    )}
                    {trophy.date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatDate(trophy.date)}
                      </div>
                    )}
                    {trophy.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {trophy.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.img
              src={lightboxUrl}
              alt="Troféu em destaque"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing">
              {editingTrophy ? "Editar Troféu" : "Adicionar Troféu"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trophy-title">Título *</Label>
              <Input
                id="trophy-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ex: Vencedor 10h Petit Le Mans"
                required
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trophy-position">Posição *</Label>
              <Input
                id="trophy-position"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="ex: P1, P2, P3"
                required
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trophy-competition">Competição</Label>
              <Input
                id="trophy-competition"
                value={form.competition}
                onChange={(e) =>
                  setForm({ ...form, competition: e.target.value })
                }
                placeholder="ex: iRacing Special Event"
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trophy-date">Data</Label>
              <Input
                id="trophy-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trophy-description">Descrição</Label>
              <Textarea
                id="trophy-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Detalhes sobre a conquista..."
                rows={3}
                className="bg-secondary resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trophy-race">Corrida associada</Label>
              <Select
                value={form.race_id}
                onValueChange={(value) =>
                  setForm({ ...form, race_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="trophy-race" className="bg-secondary">
                  <SelectValue placeholder="Nenhuma (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {races.map((race) => (
                    <SelectItem key={race.id} value={race.id}>
                      {race.name} — {race.track}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trophy-image">Foto do Troféu</Label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img
                    src={mediaUrl(form.image_url)}
                    alt="Preview"
                    className="h-16 w-16 rounded-lg object-cover border-2 border-primary/20"
                  />
                )}
                <div className="flex-1">
                  <Input
                    id="trophy-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="bg-secondary"
                  />
                  {uploadingImage && (
                    <p className="text-xs text-muted-foreground mt-1">
                      A carregar imagem...
                    </p>
                  )}
                </div>
              </div>
              {form.image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm({ ...form, image_url: "" })}
                  className="text-xs"
                >
                  Remover imagem
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitting || uploadingImage}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || uploadingImage}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingTrophy ? "Guardar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-racing">
              Apagar troféu?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres apagar este troféu da vitrine? Esta ação
              não pode ser revertida.
              {trophyToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  "{trophyToDelete.title}"
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
