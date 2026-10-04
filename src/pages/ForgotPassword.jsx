import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // URL de redirecionamento para a página de reset
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email Enviado!",
        description:
          "Verifique a sua caixa de entrada para recuperar a password.",
      });
    } catch (error) {
      console.error("Error sending reset email:", error);
      // Sempre mostra mensagem genérica por segurança (não revelar se email existe)
      toast({
        title: "Email Enviado",
        description:
          "Se o email existir no sistema, receberá instruções para recuperação.",
      });
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="page-shell flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,_hsl(60_100%_50%_/_0.08)_0%,_transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md"
        >
          <div className="card-racing p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="font-racing text-2xl font-bold mb-4">
              Email Enviado!
            </h1>
            <p className="text-muted-foreground mb-2">
              Se o email <strong>{email}</strong> existir no nosso sistema,
              receberá um link para recuperar a sua password.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Verifique também a pasta de spam/lixo.
            </p>

            <div className="space-y-3">
              <Link to="/login" className="block">
                <Button className="w-full btn-racing">Voltar ao Login</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="w-full"
              >
                Enviar para outro email
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-shell flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,_hsl(60_100%_50%_/_0.08)_0%,_transparent_70%)]" />

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
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-racing text-2xl font-bold">
              Recuperar Password
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Insira o seu email para receber um link de recuperação
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@rtr.pt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-racing"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enviar Link de Recuperação"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Segurança:</strong> Por motivos de segurança, não
              confirmamos se um email existe no sistema. Se o email for válido,
              receberá as instruções.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
