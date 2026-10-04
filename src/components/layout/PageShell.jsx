import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
  hideFooter = false,
  hideHeader = false,
}) {
  return (
    <div className={cn("page-shell flex min-h-screen flex-col", className)}>
      {!hideHeader && <Header />}
      <div className="flex-1">{children}</div>
      {!hideFooter && <Footer />}
    </div>
  );
}
