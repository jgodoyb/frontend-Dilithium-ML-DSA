import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Menu,
  X,
  User,
  LogOut,
  FileSignature,
  ShieldCheck,
  CreditCard,
  FlaskConical,
  ChevronDown,
  Compass,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMockAuth } from "@/contexts/MockAuthContext";
import Footer from "./Footer";

const publicNavKeys = [
  { key: "technology", path: "/tecnologia", icon: FlaskConical },
  { key: "plans", path: "/dashboard/plans", icon: CreditCard },
  { key: "architect", path: "/architect", icon: Compass },
  { key: "verify", path: "/dashboard/verify", icon: ShieldCheck },
];

const protectedNavKeys = [
  { key: "hub", path: "/dashboard/sign", icon: FileSignature },
];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, logout } = useMockAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = isAuthenticated
    ? [...publicNavKeys, ...protectedNavKeys]
    : publicNavKeys;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-lg border-b border-border"
            : "bg-background/80 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 grid grid-cols-[auto_1fr_auto] items-center">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            {/* New Logo SVG Placeholder based on the image */}
            <div className="relative flex items-center justify-center w-7 h-7">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#155e75] fill-current">
                <polygon points="50 5, 95 25, 95 75, 50 95, 5 75, 5 25" opacity="0.2" />
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

          {/* Desktop nav items */}
          <div className="hidden md:flex items-center justify-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.key === "technology" ? "Tecnología" : 
                   item.key === "plans" ? "Planes" : 
                   item.key === "architect" ? "El Arquitecto" : 
                   item.key === "verify" ? "Centro de Verificación" : 
                   item.key === "hub" ? "Portal de Firmas" : item.key}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
            <div className="hidden md:flex items-center justify-end gap-3">

            <AnimatePresence mode="wait">
              {isAuthenticated ? (
                <motion.div
                  key="avatar"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-secondary/50 transition-colors">
                        <Avatar className="w-7 h-7">
                          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/dashboard/identity")}>
                        <User className="w-4 h-4 mr-2" />
                        Mi Identidad
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} className="text-destructive focus:text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ) : (
                <motion.div
                  key="buttons"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => navigate("/auth?mode=login")}
                  >
                    {isAuthenticated ? (
                      "Acceso"
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => navigate("/auth?mode=register")}
                  >
                    Registrarse
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              className="text-muted-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden bg-background/98 backdrop-blur-lg border-b border-border"
            >
              <div className="px-4 pb-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-md ${
                        isActive
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.key === "technology" ? "Tecnología" : 
                       item.key === "plans" ? "Planes" : 
                       item.key === "architect" ? "El Arquitecto" : 
                       item.key === "verify" ? "Centro de Verificación" : 
                       item.key === "hub" ? "Portal de Firmas" : item.key}
                    </Link>
                  );
                })}

                <div className="pt-2 border-t border-border mt-2">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                      <Link
                        to="/dashboard/identity"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-muted-foreground rounded-md"
                      >
                        <User className="w-4 h-4" />
                        Mi Identidad
                      </Link>
                      <button
                        onClick={() => { logout(); navigate("/"); setMobileOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive rounded-md"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </>
                  ) : (
                      <div className="flex gap-2 px-3 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => { navigate("/auth?mode=login"); setMobileOpen(false); }}
                        >
                          Iniciar Sesión
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => { navigate("/auth?mode=register"); setMobileOpen(false); }}
                        >
                          Registrarse
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Page content */}
      <main>{children}</main>

      {/* Global footer */}
      <Footer />

    </div>
  );
};

export default AppShell;
