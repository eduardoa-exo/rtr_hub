/**
 * Landing scroll animation — an iRacing replay scrubbed by scroll, served from `public/`.
 * Encode as H.264 with a keyframe every few frames and no B-frames so seeking stays smooth:
 * `-c:v libx264 -crf 21 -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -an -movflags +faststart`.
 */
export const CAR_SCROLL_VIDEO = {
  desktop: "/videos/landing-lap-1080.mp4",
  mobile: "/videos/landing-lap-720.mp4",
  poster: "/images/landing/scroll/poster.webp",
};

export const CAR_GALLERY = [
  { id: "car-01", alt: "O #88 no infield, ao fim da tarde" },
  { id: "car-02", alt: "O #88 contra o sol, junto à reta da meta" },
  { id: "car-03", alt: "O #88 na inclinação da oval" },
  { id: "car-04", alt: "O #88 e o #87 a cruzar a linha de meta" },
  { id: "car-05", alt: "O #88 e o #87 lado a lado na oval" },
  { id: "car-06", alt: "O #88 visto de cima" },
  { id: "car-07", alt: "O #88 e o #87 a sair de uma curva do infield" },
  { id: "car-08", alt: "A traseira do #88 junto ao corretor" },
  { id: "car-09", alt: "O #88 junto à roda gigante" },
  { id: "car-10", alt: "O #88 em frente à bancada" },
  { id: "car-11", alt: "O #88 e o #87 na inclinação" },
].map((photo) => ({ ...photo, url: `/images/landing/car/${photo.id}.webp` }));
