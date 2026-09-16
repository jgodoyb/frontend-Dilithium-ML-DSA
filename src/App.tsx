import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MockAuthProvider } from "@/contexts/MockAuthContext";
import AppShell from "@/components/AppShell";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthRecovery from "./pages/AuthRecovery";
import Architect from "./pages/Architect";
import PlansPage from "./pages/PlansPage";
import SignatureHub from "./pages/SignatureHub";
import VerificationCenter from "./pages/VerificationCenter";
import IdentityPanel from "./pages/IdentityPanel";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import FaqPage from "./pages/FaqPage";
import NotFound from "./pages/NotFound";
import Technology from "./pages/Technology";
import LatticeBackground from "@/components/LatticeBackground";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
        <MockAuthProvider>
          <Toaster />
          <Sonner />
          <LatticeBackground />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
            {/* Auth routes */}
            <Route path="/auth" element={<AppShell><Auth /></AppShell>} />
            <Route path="/auth/recovery" element={<AppShell><AuthRecovery /></AppShell>} />

            {/* Public routes with shell */}
            <Route path="/" element={<AppShell><Index /></AppShell>} />
            <Route path="/architect" element={<AppShell><Architect /></AppShell>} />
            <Route path="/terms" element={<AppShell><TermsPage /></AppShell>} />
            <Route path="/privacy" element={<AppShell><PrivacyPage /></AppShell>} />
            <Route path="/faq" element={<AppShell><FaqPage /></AppShell>} />
            <Route path="/tecnologia" element={<AppShell><Technology /></AppShell>} />
            <Route path="/dashboard/plans" element={<AppShell><PlansPage /></AppShell>} />
            <Route path="/dashboard/verify" element={<AppShell><VerificationCenter /></AppShell>} />

            {/* Protected routes */}
            <Route path="/dashboard/sign" element={<AppShell><ProtectedRoute><SignatureHub /></ProtectedRoute></AppShell>} />
            <Route path="/dashboard/identity" element={<AppShell><ProtectedRoute><IdentityPanel /></ProtectedRoute></AppShell>} />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </MockAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
