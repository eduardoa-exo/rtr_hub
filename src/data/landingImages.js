/**
 * Landing slideshow served from the app host (Vite `public/`), not Supabase Storage.
 * Add files under `public/images/landing/` and register them here to avoid cached egress.
 */
export const LANDING_IMAGES = [
  {
    id: "hero-01",
    url: "/images/landing/hero-01.webp",
    description: "Ric Team Racing",
    storage_path: "landing/hero-01.webp",
  },
];
