import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { CarScrollSequence } from "@/components/landing/CarScrollSequence";
import { CarScrollGallery } from "@/components/landing/CarScrollGallery";
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
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,_hsl(60_100%_50%_/_0.08),_transparent_60%)]" />

      <div className="relative z-10">
        <CarScrollSequence />
        <CarScrollGallery />

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
