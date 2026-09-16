import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flag, ChevronRight, Upload, Loader2, Trash2, Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { LeMansCelebration } from "@/components/LeMansCelebration";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLandingImages } from "@/hooks/queries/useLandingImages";
import { queryKeys } from "@/hooks/queries/queryKeys";

/** Hino da equipa — https://www.youtube.com/watch?v=xcFs9jls1z8 */
const TEAM_ANTHEM_IFRAME_SRC =
  "https://www.youtube.com/embed/xcFs9jls1z8?autoplay=0&playsinline=1&rel=0&modestbranding=1";

export default function Landing() {
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: landingImages = [], isLoading: loading } = useLandingImages();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidateImages = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.images.landing() });

  useEffect(() => {
    if (landingImages.length <= 1) {
      setCurrentSlide(0);
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % landingImages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [landingImages]);

  const activeImage = landingImages[currentSlide];
  const nextImage =
    landingImages.length > 1
      ? landingImages[(currentSlide + 1) % landingImages.length]
      : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Seleciona uma imagem.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("landing")
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("landing").getPublicUrl(path);
      const { error: insertError } = await supabase.from("images").insert({
        storage_path: path,
        url: publicUrl,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        description: "Landing page",
        category: "landing",
      });

      if (insertError) throw insertError;

      toast({ title: "Imagem adicionada!" });
      await invalidateImages();
    } catch (err: any) {
      toast({ title: "Erro ao carregar imagem", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!confirm("Remover esta imagem da landing?")) return;
    try {
      await supabase.from("images").delete().eq("id", id);
      await supabase.storage.from("landing").remove([storagePath]);
      toast({ title: "Imagem removida." });
      await invalidateImages();
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err?.message ?? "", variant: "destructive" });
    }
  };

  return (
    <div className="page-shell relative">
      <Header />

      {activeImage ? (
        <div className="pointer-events-none fixed inset-0 z-0">
          <img
            key={`page-bg-${activeImage.id}`}
            src={activeImage.url}
            alt={activeImage.description ?? "Imagem da equipa"}
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-100"
          />
          {nextImage && (
            <img
              key={`page-bg-${nextImage.id}`}
              src={nextImage.url}
              alt={nextImage.description ?? "Imagem da equipa"}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-0"
            />
          )}
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,_hsl(24_90%_50%_/_0.12)_0%,_hsl(268_40%_30%_/_0.06)_40%,_transparent_70%)] bg-secondary/30" />
      )}
      <div className="pointer-events-none fixed inset-0 z-0 bg-black/40" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,_hsl(268_30%_15%_/_0.3),_transparent_60%)]" />

      <div className="relative z-10">
        {/* Celebração Le Mans */}
        <LeMansCelebration />

        {/* Chamada principal: corrida em direto */}
        <section className="relative overflow-hidden border-b border-border h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)]">

        <div className="container relative h-full flex items-start justify-center pt-24 sm:pt-28 md:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mx-auto px-4"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-racing text-4xl sm:text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white racing-glow"
            >
              <span className="text-gradient-racing">RIC TEAM</span>{" "}
              <span className="text-white">RACING</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-white/70 text-base sm:text-lg md:text-xl mb-10 font-light tracking-wide max-w-xl mx-auto"
            >
              Sim racing de resistência. Acompanha as nossas corridas e conquistas.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/live">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="btn-racing text-sm gap-2.5 px-8 py-3.5 bg-primary hover:bg-primary/90"
                  >
                    <Flag className="h-5 w-5" />
                    Ver corrida em direto
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/calendario">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="lg" className="font-racing uppercase tracking-wider gap-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm">
                    <Calendar className="h-4 w-4" />
                    Calendário
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>

        </div>
        </section>

        {/* Hero com slideshow e vídeo */}
        <section className="relative overflow-hidden border-b border-border h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)]">

        <div className="container relative flex w-full h-full flex-1 flex-col items-center justify-center py-8 sm:py-10">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-racing mb-6 text-center text-base font-bold uppercase tracking-[0.2em] text-white/80 sm:text-lg"
          >
            Hino da equipa
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="card-racing mx-auto aspect-video w-4/5 overflow-hidden shadow-2xl ring-1 ring-white/5"
          >
            <iframe
              src={TEAM_ANTHEM_IFRAME_SRC}
              title="Hino da equipa — Ric Team Racing"
              className="block h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </motion.div>
        </div>

        {isAdmin && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2 font-racing uppercase tracking-wider shadow-md"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Adicionar foto
              </Button>
            </div>
          </>
        )}

        <div className="container relative h-full">
          {landingImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2">
              {landingImages.map((img, index) => (
                <button
                  key={`slide-${img.id}`}
                  type="button"
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    index === currentSlide ? "bg-white" : "bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
        </section>

        {/* Admin: gerir fotos do slideshow */}
        {isAdmin && (
          <section className="border-t border-border bg-secondary/40 py-6">
            <div className="container">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-racing text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Fotos da página inicial (slideshow)
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-2 font-racing uppercase tracking-wider"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Adicionar outra foto
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : landingImages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ainda não há imagens. Usa &quot;Adicionar foto&quot; acima para preencher o slideshow.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {landingImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-video w-36 overflow-hidden rounded-lg border border-border bg-background sm:w-44"
                    >
                      <img
                        src={img.url}
                        alt={img.description ?? ""}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDelete(img.id, img.storage_path)}
                        aria-label="Remover imagem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
