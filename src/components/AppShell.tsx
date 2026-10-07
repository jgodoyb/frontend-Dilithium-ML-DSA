import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronDown, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMockAuth } from "@/contexts/MockAuthContext";
import Footer from "./Footer";
import { SecureContactsDialog } from "./contacts/SecureContactsDialog";
import { KineticNav } from "@/components/ui/KineticNav";
import { useTransferNotification } from "@/contexts/TransferNotificationContext";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, logout } = useMockAuth();
  const { hasUnreadTransfers } = useTransferNotification();
  const [contactsOpen, setContactsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled
            ? "bg-background/95 backdrop-blur-lg border-b border-border py-2.5"
            : "bg-background/80 backdrop-blur-sm py-3"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between">
          {/* 1. Original Q-PROOF SYSTEMS Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-7 h-7">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#155e75] fill-current">
                <polygon points="50 5, 95 25, 95 75, 50 95, 5 25" opacity="0.2" />
                <path d="M50 20 A 30 30 0 1 0 75 66 L 85 76 L 90 71 L 80 61 A 30 30 0 0 0 50 20 Z" />
                <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="8" />
              </svg>
              <div className="absolute top-0 left-1/2 w-1 h-1 bg-[#0e7490] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute top-1/4 right-0 w-1 h-1 bg-[#0e7490] rounded-full translate-x-1/2"></div>
              <div className="absolute bottom-1/4 right-0 w-1 h-1 bg-[#0e7490] rounded-full translate-x-1/2"></div>
            </div>
            <div className="flex flex-col -gap-1">
              <span className="font-extrabold text-[15px] leading-none text-foreground tracking-tight">
                Q-PROOF
              </span>
              <span className="text-[#0e7490] font-medium text-[8px] leading-tight tracking-[0.2em]">
                SYSTEMS
              </span>
            </div>
          </Link>

          {/* 2. Right Side Controls: Profile Dropdown + Minimalist Hamburger Menu Trigger */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-secondary/50 transition-colors focus:outline-none">
                    <div className="relative">
                      <Avatar className="w-7 h-7 ring-1 ring-white/10">
                        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#090a0f] border-white/10 text-white shadow-2xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} className="text-destructive focus:text-destructive cursor-pointer focus:bg-red-500/10 text-xs">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Minimalist 3 Horizontal Lines (Hamburger) Menu Trigger Button */}
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="relative z-50 p-2 text-neutral-300 hover:text-white transition-all duration-300 focus:outline-none rounded-lg hover:bg-white/10 active:scale-95"
              aria-label={isMenuOpen ? "Cerrar Menú" : "Abrir Menú"}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                {isMenuOpen ? (
                  <X className="w-5 h-5 text-white transform rotate-0 transition-transform duration-300" />
                ) : (
                  <Menu className="w-5 h-5 text-neutral-200 transform transition-transform duration-300" />
                )}
                {hasUnreadTransfers && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-neutral-950 animate-pulse pointer-events-none" />
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* KineticNav Drawer Panel */}
      <KineticNav
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onToggle={() => setIsMenuOpen((prev) => !prev)}
        hideDefaultHeaderButton={true}
        hasUnreadTransfers={hasUnreadTransfers}
      />

      {/* Main Page Content */}
      <main className="flex-1 pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global footer */}
      <Footer />

      {/* Diálogo de Contactos Seguros */}
      <SecureContactsDialog open={contactsOpen} onOpenChange={setContactsOpen} />
    </div>
  );
};

export default AppShell;
