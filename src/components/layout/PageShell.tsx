import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  /** Skip the shared footer (e.g. auth screens that center a form). */
  hideFooter?: boolean;
  /** Skip the shared header when the page renders its own chrome. */
  hideHeader?: boolean;
};

export function PageShell({
  children,
  className,
  hideFooter = false,
  hideHeader = false,
}: PageShellProps) {
  return (
    <div className={cn("page-shell flex min-h-screen flex-col", className)}>
      {!hideHeader && <Header />}
      <div className="flex-1">{children}</div>
      {!hideFooter && <Footer />}
    </div>
  );
}
