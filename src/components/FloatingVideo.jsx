import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const partners = [
  {
    videoSrc: "/images/parcerias/Logo pc componentes Glow cor.webm",
    link: "https://ricfazeres.net/PcComponentes",
    objectFit: "cover",
  },
  {
    videoSrc: "/images/parcerias/Skinlab.webm",
    link: "https://www.instagram.com/mvskinlab/",
    objectFit: "contain",
  },
];

export const FloatingVideo = () => {
  const [currentPartnerIndex, setCurrentPartnerIndex] = useState(0);

  useEffect(() => {
    if (partners.length <= 1) {
      return;
    }
    const interval = setInterval(() => {
      setCurrentPartnerIndex((prev) => (prev + 1) % partners.length);
    }, 15000); // Change partner every 15 seconds

    return () => clearInterval(interval);
  }, [partners.length]);

  const currentPartner = partners[currentPartnerIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="fixed bottom-3 right-3 z-50 sm:bottom-4 sm:right-4"
    >
      <AnimatePresence mode="wait">
        <motion.a
          key={currentPartnerIndex}
          href={currentPartner.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="h-32 w-32 sm:h-48 sm:w-48 md:h-64 md:w-64 rounded-lg overflow-hidden cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <video
              key={currentPartner.videoSrc}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-center pointer-events-none"
              style={{ objectFit: currentPartner.objectFit }}
            >
              <source src={currentPartner.videoSrc} type="video/webm" />
            </video>
          </motion.div>
        </motion.a>
      </AnimatePresence>
    </motion.div>
  );
};
