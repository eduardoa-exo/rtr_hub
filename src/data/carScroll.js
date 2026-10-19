/**
 * Landing scroll animation — frames of an iRacing replay served from `public/`.
 * To swap the video: replace the files under `public/images/landing/scroll/{desktop,mobile}/`
 * (f0001.webp … f0200.webp) and update `CAR_SCROLL_FRAME_COUNT` if the count changes.
 */
export const CAR_SCROLL_FRAME_COUNT = 200;

export function carScrollFrameUrl(set, index) {
  return `/images/landing/scroll/${set}/f${String(index + 1).padStart(4, "0")}.webp`;
}

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
