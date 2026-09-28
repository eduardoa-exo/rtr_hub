import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flag, ChevronRight, Calendar } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useLandingImages } from "@/hooks/queries/useLandingImages";

/** Hino da equipa — https://www.youtube.com/watch?v=xcFs9jls1z8 */
const TEAM_ANTHEM_IFRAME_SRC =
  "https://www.youtube.com/embed/xcFs9jls1z8?autoplay=0&playsinline=1&rel=0&modestbranding=1";

export default function Landing() {
  const { data: landingImages = [] } = useLandingImages();
  const [currentSlide, setCurrentSlide] = useState(0);

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

  return (
    <PageShell>
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
        <div className="pointer-events-none fixed inset-0 z-0 bg-secondary/40" />
      )}
      <div className="pointer-events-none fixed inset-0 z-0 bg-black/45" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,_hsl(286_55%_28%_/_0.3),_transparent_60%)]" />

      <div className="relative z-10">
        <section className="relative overflow-hidden h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)]">
          <div className="container relative h-full flex flex-col items-center justify-center pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-3xl mx-auto px-4"
            >
              <p className="font-racing text-sm sm:text-base uppercase tracking-[0.28em] text-white/85 mb-4">
                <span className="text-gradient-racing">RTR</span>{" "}
                <span className="text-white/80">Racing</span>
              </p>
              <h1 className="font-racing text-3xl sm:text-5xl md:text-6xl font-bold mb-5 tracking-tight text-white">
                Sim racing de resistência
              </h1>
              <p className="text-white/70 text-base sm:text-lg mb-8 font-light tracking-wide max-w-xl mx-auto">
                Acompanha as nossas corridas, classificação e calendário em direto.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/live">
                  <Button
                    size="lg"
                    className="btn-racing text-sm gap-2.5 px-8 py-3.5"
                  >
                    <Flag className="h-5 w-5" />
                    Ver corrida em direto
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/calendario">
                  <Button
                    variant="outline"
                    size="lg"
                    className="font-racing uppercase tracking-wider gap-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm"
                  >
                    <Calendar className="h-4 w-4" />
                    Calendário
                  </Button>
                </Link>
              </div>
            </motion.div>

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

        <section className="relative overflow-hidden border-t border-white/10 min-h-[70vh] flex items-center">
          <div className="container relative flex w-full flex-col items-center justify-center py-12 sm:py-16">
            <h2 className="font-racing mb-6 text-center text-base font-bold uppercase tracking-[0.2em] text-white/80 sm:text-lg">
              Hino da equipa
            </h2>
            <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
              <iframe
                src={TEAM_ANTHEM_IFRAME_SRC}
                title="Hino da equipa — RTR Racing"
                className="block h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
