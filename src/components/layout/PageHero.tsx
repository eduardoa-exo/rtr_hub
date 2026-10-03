import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  /** Tighter vertical padding for denser pages. */
  compact?: boolean;
  children?: ReactNode;
};

export function PageHero({
  title,
  subtitle,
  className,
  compact = false,
  children,
}: PageHeroProps) {
  return (
    <section className={cn("relative overflow-hidden border-b border-border", className)}>
      <div className="absolute inset-0 page-hero-wash" />
      <div className={cn("container relative", compact ? "py-8 md:py-10" : "py-10 md:py-14")}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="font-racing text-2xl sm:text-4xl md:text-5xl font-bold mb-3 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground max-w-xl mx-auto text-base sm:text-lg">
              {subtitle}
            </p>
          )}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
