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

/** Hino da equipa — https://www.youtube.com/watch?v=xcFs9jls1z8 */
export const TEAM_ANTHEM_IFRAME_SRC =
  "https://www.youtube.com/embed/xcFs9jls1z8?autoplay=0&playsinline=1&rel=0&modestbranding=1";
