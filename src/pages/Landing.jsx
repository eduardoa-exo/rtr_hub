import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { CarScrollSequence } from "@/components/landing/CarScrollSequence";
import { useLandingImages } from "@/hooks/queries/useLandingImages";

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
    <PageShell hideFooter>
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
      </div>
    </PageShell>
  );
}
