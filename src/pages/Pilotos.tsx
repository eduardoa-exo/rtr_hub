import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, User, Instagram, ExternalLink, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { RacingLoader } from "@/components/RacingLoader";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { uploadMedia } from "@/lib/r2Upload";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/layout/PageHero";
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
import { useDrivers } from "@/hooks/queries/useDrivers";
import { useCategories } from "@/hooks/queries/useCategories";
import { queryKeys } from "@/hooks/queries/queryKeys";
import type { Database } from "@/integrations/supabase/types";

type Driver = Database["public"]["Tables"]["drivers"]["Row"];

export default function Pilotos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: drivers = [], isLoading: loading } = useDrivers();
  const { data: categories = [] } = useCategories(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    known_as: "",
    instagram: "",
    image_url: "",
  });

  const invalidateDrivers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });

  const openAdd = () => {
    setEditingDriver(null);
    setForm({
      name: "",
      category: "",
      known_as: "",
      instagram: "",
      image_url: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (driver: Driver, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDriver(driver);
    setForm({
      name: driver.name,
      category: driver.category || "",
      known_as: driver.known_as || "",
      instagram: driver.instagram || "",
      image_url: driver.image_url || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDriver(null);
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

    // Validate file size (max 5MB)
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Não autenticado");
      }

      const { file: compressed } = await compressImage(file, {
        maxEdge: 800,
        quality: 0.8,
      });

      const driverId =
        editingDriver?.id || `temp-${Math.random().toString(36).substring(2)}`;

      const { publicUrl } = await uploadMedia({
        file: compressed,
        type: "championship",
        authToken: session.access_token,
        entityId: driverId,
      });

      setForm({ ...form, image_url: publicUrl });
      toast({ title: "Imagem carregada!" });
    } catch (err: unknown) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do piloto é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const driverData = {
      name: form.name.trim(),
      category: form.category || null,
      known_as: form.known_as.trim() || null,
      instagram: form.instagram.trim() || null,
      image_url: form.image_url || null,
    };

    if (editingDriver) {
      const { error } = await supabase
        .from("drivers")
        .update(driverData)
        .eq("id", editingDriver.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Piloto atualizado!" });
        closeDialog();
        invalidateDrivers();
      }
    } else {
      const { error } = await supabase
        .from("drivers")
        .insert(driverData);

      if (error) {
        toast({
          title: "Erro ao adicionar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Piloto adicionado!" });
        closeDialog();
        invalidateDrivers();
      }
    }

    setSubmitting(false);
  };

  const openDelete = (driver: Driver, e: React.MouseEvent) => {
    e.stopPropagation();
    setDriverToDelete(driver);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!driverToDelete) return;

    const { error } = await supabase
      .from("drivers")
      .delete()
      .eq("id", driverToDelete.id);

    if (error) {
      toast({
        title: "Erro ao apagar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Piloto apagado!" });
      invalidateDrivers();
    }

    setDeleteDialogOpen(false);
    setDriverToDelete(null);
  };

  return (
    <PageShell>
      <PageHero
        title="Pilotos"
        subtitle="Os pilotos que representam a Ric Team Racing no iRacing."
      />

      {/* Content */}
      <main className="container py-12">
        {loading ? (
          <RacingLoader className="py-12" />
        ) : drivers.length === 0 ? (
          <div className="card-racing p-12 text-center max-w-lg mx-auto">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-racing text-xl mb-2">Sem pilotos</h2>
            <p className="text-muted-foreground mb-6">
              Os pilotos da equipa serão adicionados em breve.
            </p>
            {user && (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar piloto
              </Button>
            )}
          </div>
        ) : (
          <>
            {user && (
              <div className="flex justify-end mb-6 max-w-5xl mx-auto">
                <Button onClick={openAdd} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar piloto
                </Button>
              </div>
            )}
            <div className="grid gap-5 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto">
            {drivers.map((driver, index) => {
              const instagramHandle = driver.instagram?.replace(/^@/, "")?.trim();
              const instagramUrl =
                instagramHandle ?
                  `https://instagram.com/${instagramHandle}`
                : null;

              return (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 20 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="card-racing p-5 sm:p-6 group relative flex flex-col items-center text-center"
                >
                  {user && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-secondary/80 backdrop-blur-sm"
                        onClick={(e) => openEdit(driver, e)}
                        aria-label={`Editar ${driver.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-secondary/80 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive"
                        onClick={(e) => openDelete(driver, e)}
                        aria-label={`Apagar ${driver.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 to-secondary ring-2 ring-white/5 mb-4">
                    {driver.image_url ? (
                      <img
                        src={driver.image_url}
                        alt={driver.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain object-center"
                      />
                    ) : (
                      <User className="h-7 w-7 text-primary/60" />
                    )}
                  </div>
                  <h3 className="font-racing text-sm sm:text-base font-bold truncate w-full">
                    {driver.name}
                  </h3>
                  {driver.category && (
                    <span className="inline-block mt-2 px-3 py-1 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider rounded-full bg-secondary/60 border border-border/50">
                      {driver.category}
                    </span>
                  )}
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-[#E4405F] hover:text-[#E4405F]/80 transition-colors"
                      aria-label={`Instagram de ${driver.name}`}
                    >
                      <img src="/images/instagram.png" alt="Instagram" loading="lazy" decoding="async" className="h-4 w-4 shrink-0" />
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
          </>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing">
              {editingDriver ? "Editar Piloto" : "Adicionar Piloto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Nome *</Label>
              <Input
                id="driver-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do Piloto"
                required
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-category">Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger id="driver-category" className="bg-secondary">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="driver-known-as">Alcunha</Label>
              <Input
                id="driver-known-as"
                value={form.known_as}
                onChange={(e) => setForm({ ...form, known_as: e.target.value })}
                placeholder="ex: Ric, Fazeres"
                className="bg-secondary"
              />
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="driver-instagram">Instagram</Label>
              <Input
                id="driver-instagram"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="@username ou username"
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-image">Foto do Piloto</Label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                  />
                )}
                <div className="flex-1">
                  <Input
                    id="driver-image"
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
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingDriver ? "Guardar" : "Adicionar"}
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
              Apagar piloto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres apagar este piloto? Esta ação não pode ser revertida.
              {driverToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  "{driverToDelete.name}"
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
