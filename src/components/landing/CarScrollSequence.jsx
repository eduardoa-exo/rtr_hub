import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Flag, ChevronRight, Calendar, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CAR_SCROLL_VIDEO, TEAM_ANTHEM_IFRAME_SRC } from "@/data/carScroll";

const STAGE_CLASSES =
  "sticky top-16 sm:top-20 md:top-24 h-[calc(100svh-4rem)] sm:h-[calc(100svh-5rem)] md:h-[calc(100svh-6rem)] overflow-hidden bg-black";

/** Vanishing point of the onboard footage (the horizon), as CSS percentages of the stage. */
const VANISHING_POINT = { x: "50%", y: "38%" };

/** Distance range of a board, in px along the view axis: far on the horizon → beside the car. */
const Z_FAR = -4500;
const Z_PASS = 500;

const CARD_CLASSES =
  "w-[78vw] max-w-sm rounded-2xl border border-white/10 bg-[hsl(261_89%_8%/0.8)] p-6 shadow-2xl backdrop-blur-md sm:w-[26rem] sm:max-w-none sm:p-8";

/** Track-side boards: `range` is the scroll window in which the car approaches and passes it. */
const BOARDS = [
  {
    range: [0.08, 0.3],
    side: -1,
    kicker: "#88 · GT3",
    title: "BMW M4 GT3",
    text: "O carro da Ric Team Racing na classe GT3, com a pintura da equipa em branco, magenta e roxo.",
  },
  {
    range: [0.3, 0.52],
    side: 1,
    kicker: "Endurance",
    title: "6, 8, 10, 12 e 24 horas",
    text: "Provas de resistência onde contam a constância, as trocas de piloto e a estratégia de boxes.",
  },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

/** Perspective layer whose vanishing point matches the footage's horizon. */
function TrackLayer({ isMobile, children }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        perspective: isMobile ? 600 : 900,
        perspectiveOrigin: `${VANISHING_POINT.x} ${VANISHING_POINT.y}`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A board that comes out of the horizon, grows as the car gets closer and passes beside it.
 * With `settle`, it stops in front of the car instead of passing (the finish gantry).
 */
function TrackBoard({ progress, range, side = 0, settle = false, isMobile, reduceMotion, children }) {
  const [start, end] = range;
  const fadeIn = start + (end - start) * 0.08;
  const fadeOut = end - (end - start) * 0.1;
  const moving = !reduceMotion;

  const z = useTransform(progress, [start, end], moving ? [Z_FAR, settle ? -150 : Z_PASS] : [0, 0]);
  const opacity = useTransform(
    progress,
    settle ? [start, fadeIn] : [start, fadeIn, fadeOut, end],
    settle ? [0, 1] : [0, 1, 1, 0],
  );
  const pointerEvents = useTransform(opacity, (o) => (o > 0.3 ? "auto" : "none"));
  const x = moving ? side * (isMobile ? 140 : 420) : 0;
  const rotateY = moving ? -side * (isMobile ? 18 : 32) : 0;

  return (
    <motion.div
      className="absolute"
      style={{
        left: VANISHING_POINT.x,
        top: VANISHING_POINT.y,
        x,
        y: settle ? 40 : isMobile ? -40 : -60,
        z,
        rotateY,
        opacity,
        pointerEvents,
        originX: 0,
        originY: 0,
      }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">{children}</div>
    </motion.div>
  );
}

export function CarScrollSequence() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const heroZ = useTransform(scrollYProgress, [0, 0.08], reduceMotion ? [0, 0] : [0, Z_PASS]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.07], [1, 0]);
  const heroPointerEvents = useTransform(heroOpacity, (o) => (o > 0.3 ? "auto" : "none"));
  const hintOpacity = useTransform(scrollYProgress, [0, 0.03], [1, 0]);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section || reduceMotion) return undefined;

    const src = window.matchMedia("(max-width: 767px)").matches
      ? CAR_SCROLL_VIDEO.mobile
      : CAR_SCROLL_VIDEO.desktop;
    const controller = new AbortController();
    let objectUrl = null;
    let visible = true;
    let current = 0;
    let raf = 0;

    // Whole file in memory: seeking never waits on range requests.
    fetch(src, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
      })
      .catch((err) => {
        if (err.name !== "AbortError") video.src = src;
      });

    // iOS Safari only paints seeked frames after the video has played once.
    const primeDecoder = () => {
      video.play().then(() => video.pause()).catch(() => {});
    };
    video.addEventListener("loadeddata", primeDecoder, { once: true });

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibilityObserver.observe(section);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden || !video.duration || video.readyState < 1) return;
      const target = scrollYProgress.get() * (video.duration - 0.05);
      current += (target - current) * 0.15;
      if (!video.seeking && Math.abs(video.currentTime - current) > 1 / 60) {
        video.currentTime = current;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      controller.abort();
      cancelAnimationFrame(raf);
      visibilityObserver.disconnect();
      video.removeEventListener("loadeddata", primeDecoder);
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reduceMotion, scrollYProgress]);

  return (
    <section
      ref={sectionRef}
      aria-label="Uma volta a bordo do #88"
      className="relative h-[700vh]"
    >
      <div className={STAGE_CLASSES}>
        {reduceMotion ? (
          <img
            src={CAR_SCROLL_VIDEO.poster}
            alt="Vista a bordo do carro #88 da Ric Team Racing em pista"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            poster={CAR_SCROLL_VIDEO.poster}
            aria-label="Volta a bordo do carro #88 da Ric Team Racing"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        <TrackLayer isMobile={isMobile}>
          <motion.div
            style={{ z: heroZ, opacity: heroOpacity, pointerEvents: heroPointerEvents }}
            className="absolute inset-x-0 bottom-20 mx-auto max-w-3xl px-4 text-center sm:bottom-24"
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

          {BOARDS.map((board) => (
            <TrackBoard
              key={board.title}
              progress={scrollYProgress}
              range={board.range}
              side={board.side}
              isMobile={isMobile}
              reduceMotion={reduceMotion}
            >
              <div className={CARD_CLASSES}>
                <p className="mb-3 font-racing text-xs uppercase tracking-[0.28em] text-primary">
                  {board.kicker}
                </p>
                <h2 className="mb-3 font-racing text-2xl font-bold text-white sm:text-3xl">
                  {board.title}
                </h2>
                <p className="font-light leading-relaxed text-white/80">{board.text}</p>
              </div>
            </TrackBoard>
          ))}

          <TrackBoard
            progress={scrollYProgress}
            range={[0.52, 0.76]}
            side={-1}
            isMobile={isMobile}
            reduceMotion={reduceMotion}
          >
            <div className={`${CARD_CLASSES} sm:w-[34rem]`}>
              <p className="mb-4 font-racing text-xs uppercase tracking-[0.28em] text-primary">
                Hino da equipa
              </p>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                <iframe
                  src={TEAM_ANTHEM_IFRAME_SRC}
                  title="Hino da equipa — RTR Racing"
                  loading="lazy"
                  className="block h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            </div>
          </TrackBoard>

          <TrackBoard
            progress={scrollYProgress}
            range={[0.78, 0.94]}
            settle
            isMobile={isMobile}
            reduceMotion={reduceMotion}
          >
            <div className={`${CARD_CLASSES} text-center sm:w-[34rem]`}>
              <p className="mb-3 font-racing text-xs uppercase tracking-[0.28em] text-primary">
                Bandeira de xadrez
              </p>
              <h2 className="mb-3 font-racing text-2xl font-bold text-white sm:text-3xl">
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
          </TrackBoard>
        </TrackLayer>

        <motion.div
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap font-racing text-[10px] uppercase tracking-[0.2em] text-white/80 sm:text-[11px] sm:tracking-[0.26em]"
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
    </section>
  );
}
