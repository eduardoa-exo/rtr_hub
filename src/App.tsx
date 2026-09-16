import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { FloatingVideo } from "@/components/FloatingVideo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RacingLoader } from "@/components/RacingLoader";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import Contacts from "./pages/Contacts";
import RedesSociais from "./pages/RedesSociais";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AboutUs from "./pages/AboutUs";

const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));
const Palmares = lazy(() => import("./pages/Palmares"));
const Pilotos = lazy(() => import("./pages/Pilotos"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Classificacao = lazy(() => import("./pages/Classificacao"));
const ScoreboardLive = lazy(() => import("./pages/ScoreboardLive"));
const ScoreboardLiveAdmin = lazy(() => import("./pages/ScoreboardLiveAdmin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FloatingVideo />
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<RacingLoader className="min-h-screen" />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/live" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/scoreboard-live" element={<ScoreboardLive />} />
                <Route path="/scoreboard-live-admin" element={<ProtectedRoute><ScoreboardLiveAdmin /></ProtectedRoute>} />
                <Route path="/palmares" element={<Palmares />} />
                <Route path="/pilotos" element={<Pilotos />} />
                <Route path="/classificacao" element={<Classificacao />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/redes" element={<RedesSociais />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
