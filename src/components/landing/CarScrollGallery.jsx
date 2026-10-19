import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { CAR_GALLERY } from "@/data/carScroll";

function GalleryCard({ photo }) {
  return (
    <figure className="relative m-0 aspect-video w-[82vw] flex-none snap-center overflow-hidden rounded-2xl bg-secondary sm:w-[56vw]">
      <img
        src={photo.url}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-10 text-sm text-white/90">
        {photo.alt}
      </figcaption>
    </figure>
  );
}

function GalleryHeading() {
  return (
    <div className="container flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 font-racing text-xs uppercase tracking-[0.28em] text-primary">
          Galeria
        </p>
        <h2 className="font-racing text-3xl font-bold text-white sm:text-4xl">Na pista</h2>
      </div>
      <p className="hidden max-w-sm font-light text-white/70 sm:block">
        Capturas do iRacing com a pintura RTR.
      </p>
    </div>
  );
}

/** Horizontal photo strip driven by vertical scroll (pinned while it slides). */
export function CarScrollGallery() {
  const sectionRef = useRef(null);
  const stripRef = useRef(null);
  const [distance, setDistance] = useState(0);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, (v) => -v * distance);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || reduceMotion) return undefined;
    const measure = () => setDistance(Math.max(0, strip.scrollWidth - strip.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <section aria-label="Galeria" className="relative border-t border-white/10 py-16">
        <GalleryHeading />
        <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[6vw] pb-4">
          {CAR_GALLERY.map((photo) => (
            <GalleryCard key={photo.id} photo={photo} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Galeria"
      className="relative h-[320vh] border-t border-white/10"
    >
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col justify-center gap-8 overflow-hidden sm:top-20 sm:h-[calc(100svh-5rem)] md:top-24 md:h-[calc(100svh-6rem)]">
        <GalleryHeading />
        <motion.div ref={stripRef} style={{ x }} className="flex gap-5 px-[6vw] will-change-transform">
          {CAR_GALLERY.map((photo) => (
            <GalleryCard key={photo.id} photo={photo} />
          ))}
        </motion.div>
        <div className="container">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/15">
            <motion.div
              style={{ scaleX: scrollYProgress }}
              className="h-full w-full origin-left bg-primary"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
