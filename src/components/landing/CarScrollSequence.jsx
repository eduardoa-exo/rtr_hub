import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Flag, ChevronRight, Calendar, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CAR_SCROLL_FRAME_COUNT, carScrollFrameUrl } from "@/data/carScroll";

const STAGE_CLASSES =
  "sticky top-16 sm:top-20 md:top-24 h-[calc(100svh-4rem)] sm:h-[calc(100svh-5rem)] md:h-[calc(100svh-6rem)] overflow-hidden bg-black";

/** Scroll progress at which each chapter card sits centred on screen. */
const CHAPTERS = [
  {
    at: 0.3,
    align: "justify-start",
    kicker: "#88 · GT3",
    title: "BMW M4 GT3",
    text: "O carro da Ric Team Racing na classe GT3, com a pintura da equipa em branco, magenta e roxo.",
  },
  {
    at: 0.6,
    align: "justify-end",
    kicker: "Endurance",
    title: "6, 8, 10, 12 e 24 horas",
    text: "Provas de resistência onde contam a constância, as trocas de piloto e a estratégia de boxes.",
  },
];

/** Load order coarse-to-fine, so a fast scroll always has a nearby frame to show. */
function loadOrder(count) {
  const seen = new Set();
  const order = [];
  for (let step = 16; step >= 1; step /= 2) {
    for (let i = 0; i < count; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
}

function nearestLoaded(images, index) {
  for (let d = 0; d < images.length; d++) {
    if (images[index - d]?.complete) return images[index - d];
    if (images[index + d]?.complete) return images[index + d];
  }
  return null;
}

function drawCover(canvas, img) {
  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;
  const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

export function CarScrollSequence() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.08], [0, -40]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.03], [1, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return undefined;

    const set = window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
    const images = new Array(CAR_SCROLL_FRAME_COUNT);
    const stillIndex = Math.round(CAR_SCROLL_FRAME_COUNT * 0.4);
    const order = reduceMotion ? [stillIndex] : loadOrder(CAR_SCROLL_FRAME_COUNT);
    let cancelled = false;
    let visible = true;
    let dirty = true;
    let current = 0;
    let drawn = null;
    let raf = 0;

    let next = 0;
    const loadNext = () => {
      if (cancelled || next >= order.length) return;
      const index = order[next++];
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        dirty = true;
        loadNext();
      };
      img.onerror = loadNext;
      img.src = carScrollFrameUrl(set, index);
      images[index] = img;
    };
    for (let i = 0; i < 6; i++) loadNext();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      dirty = true;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibilityObserver.observe(section);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const target = reduceMotion
        ? stillIndex
        : scrollYProgress.get() * (CAR_SCROLL_FRAME_COUNT - 1);
      current += (target - current) * (reduceMotion ? 1 : 0.18);
      const img = nearestLoaded(images, Math.round(current));
      if (img && (img !== drawn || dirty)) {
        drawCover(canvas, img);
        drawn = img;
        dirty = false;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [reduceMotion, scrollYProgress]);

  return (
    <section
      ref={sectionRef}
      aria-label="Uma volta a bordo do #88"
      className="relative h-[600vh]"
    >
      <div className={STAGE_CLASSES}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Volta a bordo do carro #88 da Ric Team Racing"
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        <motion.div
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2 font-racing text-[11px] uppercase tracking-[0.26em] text-white/80"
        >
          <ArrowDown className="h-4 w-4" />
          Faz scroll para arrancar
        </motion.div>

        <div className="pointer-events-none absolute inset-x-6 bottom-6 flex items-center gap-4 sm:inset-x-10">
          <span className="font-racing text-[11px] tracking-[0.22em] text-primary">#88</span>
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
            <motion.div
              style={{ scaleX: scrollYProgress }}
              className="h-full w-full origin-left bg-primary"
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 flex h-[calc(100svh-4rem)] items-end justify-center pb-24 sm:h-[calc(100svh-5rem)] md:h-[calc(100svh-6rem)]">
          <motion.div
            style={{ opacity: heroOpacity, y: heroY }}
            className="pointer-events-auto mx-auto max-w-3xl px-4 text-center"
          >
            <p className="mx-auto mb-8 max-w-xl text-base font-light tracking-wide text-white/90 [text-shadow:0_2px_18px_rgba(0,0,0,0.8)] sm:text-lg">
              Acompanha as nossas corridas, classificação e calendário em
              direto.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/live">
                <Button size="lg" className="btn-racing gap-2.5 px-8 py-3.5 text-sm">
                  <Flag className="h-5 w-5" />
                  Ver corrida em direto
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/calendario">
                <Button
                  variant="outline"
                  size="lg"
                  className="btn-racing-secondary gap-2 px-8 py-3.5 text-sm backdrop-blur-sm"
                >
                  <Calendar className="h-4 w-4" />
                  Calendário
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {CHAPTERS.map((chapter) => (
          <div
            key={chapter.title}
            style={{ top: `${chapter.at * 500}vh` }}
            className={`container absolute inset-x-0 flex h-screen items-end pb-20 sm:items-center sm:pb-0 ${chapter.align}`}
          >
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/10 bg-[hsl(261_89%_8%/0.75)] p-7 backdrop-blur-md sm:p-8">
              <p className="mb-3 font-racing text-xs uppercase tracking-[0.28em] text-primary">
                {chapter.kicker}
              </p>
              <h2 className="mb-3 font-racing text-2xl font-bold text-white sm:text-4xl">
                {chapter.title}
              </h2>
              <p className="font-light leading-relaxed text-white/80">{chapter.text}</p>
            </div>
          </div>
        ))}

        <div
          style={{ top: "460vh" }}
          className="container absolute inset-x-0 flex h-screen items-center justify-center"
        >
          <div className="pointer-events-auto max-w-xl rounded-2xl border border-white/10 bg-[hsl(261_89%_8%/0.75)] p-8 text-center backdrop-blur-md">
            <p className="mb-3 font-racing text-xs uppercase tracking-[0.28em] text-primary">
              Bandeira de xadrez
            </p>
            <h2 className="mb-3 font-racing text-2xl font-bold text-white sm:text-4xl">
              A próxima corrida já está marcada
            </h2>
            <p className="mb-6 font-light leading-relaxed text-white/80">
              Vê quando voltamos à pista e acompanha a classificação ao longo da época.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/calendario">
                <Button size="lg" className="btn-racing px-8 py-3.5 text-sm">
                  Ver calendário
                </Button>
              </Link>
              <Link to="/classificacao">
                <Button
                  variant="outline"
                  size="lg"
                  className="btn-racing-secondary px-8 py-3.5 text-sm"
                >
                  Classificação
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
