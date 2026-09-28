import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Validações de segurança da password
  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
    };
  };

  useEffect(() => {
    // Verifica se existe token de recuperação válido
    const checkToken = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setValidToken(false);
          toast({
            variant: "destructive",
            title: "Link Inválido",
            description: "Este link de recuperação é inválido ou expirou. Por favor, solicite um novo.",
          });
          setTimeout(() => navigate("/forgot-password"), 3000);
        } else {
          setValidToken(true);
        }
      } catch (error) {
        setValidToken(false);
        console.error("Error checking token:", error);
      }
    };

    checkToken();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações de segurança
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As passwords não coincidem.",
      });
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Password fraca",
        description: "A password não cumpre os requisitos de segurança.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Sucesso!",
        description: "Password alterada com sucesso. A redirecionar para o login...",
      });

      // Fazer logout após alterar a password
      await supabase.auth.signOut();

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível alterar a password. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(password);

  if (validToken === null) {
    return (
      <div className="page-shell flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (validToken === false) {
    return (
      <div className="page-shell flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-racing text-2xl font-bold mb-2">Link Inválido</h1>
          <p className="text-muted-foreground">A redirecionar...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-shell flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,_hsl(306_70%_50%_/_0.12)_0%,_transparent_70%)]" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative text-center"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="font-racing text-2xl font-bold mb-2">Password Alterada!</h1>
          <p className="text-muted-foreground">A sua password foi alterada com sucesso.</p>
          <p className="text-sm text-muted-foreground mt-2">A redirecionar para o login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-shell flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,_hsl(306_70%_50%_/_0.12)_0%,_transparent_70%)]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Login
        </Link>

        <div className="card-racing p-8">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-racing text-2xl font-bold">
              Nova Password
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Insira a sua nova password com requisitos de segurança
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="bg-secondary border-border"
              />
            </div>

            {/* Indicadores de segurança da password */}
            {password && (
              <div className="space-y-2 p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm font-medium mb-2">Requisitos de Segurança:</p>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.minLength ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    Mínimo 8 caracteres
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasUpperCase ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.hasUpperCase ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    Uma letra maiúscula
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasLowerCase ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.hasLowerCase ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    Uma letra minúscula
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.hasNumber ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    Um número
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.hasSpecialChar ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    Um caractere especial (!@#$%^&*...)
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
              className="w-full btn-racing"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Alterar Password"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
