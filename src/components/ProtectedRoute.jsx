import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import { RacingLoader } from "@/components/RacingLoader";

export function ProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
    } else if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Não tens permissão para aceder a esta página.",
      });
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, loading, navigate, toast]);

  if (loading) {
    return <RacingLoader className="min-h-screen" />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
