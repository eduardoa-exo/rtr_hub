import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag,
  Trophy,
  HelpCircle,
  Settings,
  LogIn,
  LogOut,
  Mail,
  Users,
  Globe,
  Calendar,
  BarChart3,
  Info,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useScoreboardLiveSession } from "@/hooks/queries/useScoreboardLive";

const baseNavItems = [
  { type: "direct", path: "/live", label: "Live", icon: Flag },
  { type: "direct", path: "/calendario", label: "Calendário", icon: Calendar },
  {
    type: "dropdown",
    label: "Competição",
    icon: Trophy,
    items: [
      { path: "/classificacao", label: "Classificação", icon: BarChart3 },
      { path: "/palmares", label: "Palmarés", icon: Trophy },
    ],
  },
  {
    type: "dropdown",
    label: "Equipa",
    icon: Users,
    items: [
      { path: "/pilotos", label: "Pilotos", icon: Users },
      { path: "/about", label: "Sobre Nós", icon: Info },
    ],
  },
  {
    type: "dropdown",
    label: "Comunidade",
    icon: Globe,
    items: [
      { path: "/redes", label: "Redes Sociais", icon: Globe },
      { path: "/faq", label: "FAQ", icon: HelpCircle },
      { path: "/contacts", label: "Contactos", icon: Mail },
    ],
  },
];

export function Header() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpenCategory, setMobileOpenCategory] = useState(null);
  const [navItems, setNavItems] = useState(baseNavItems);
  const { data: liveSession } = useScoreboardLiveSession();
  const scoreboardEnabled = Boolean(liveSession?.enabled);
  const navRef = useRef(null);

  useEffect(() => {
    if (scoreboardEnabled) {
      const scoreboardItem = {
        type: "direct",
        path: "/scoreboard-live",
        label: "Scoreboard",
        icon: Trophy,
        conditional: true,
      };

      const liveIndex = baseNavItems.findIndex(
        (item) => item.type === "direct" && item.path === "/live",
      );

      const newNavItems = [...baseNavItems];
      newNavItems.splice(liveIndex + 1, 0, scoreboardItem);
      setNavItems(newNavItems);
    } else {
      setNavItems(baseNavItems);
    }
  }, [scoreboardEnabled]);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    const onPointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const isDropdownActive = (items) =>
    items.some((item) => location.pathname === item.path);

  const DirectNavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    const isLive = item.path === "/live";
    const Icon = item.icon;

    const colorClasses = isLive
      ? isActive
        ? "text-red-500"
        : "text-red-500/80 hover:text-red-500"
      : isActive
        ? "text-racing-neon"
        : "text-muted-foreground hover:text-foreground";

    const underlineClass = isLive ? "bg-red-500" : "bg-racing-neon";

    return (
      <Link to={item.path}>
        <motion.div
          className={`relative flex items-center gap-2 px-4 py-2 font-racing text-sm uppercase tracking-wider transition-colors ${colorClasses}`}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          <Icon className="h-4 w-4" />
          {item.label}
          {isActive && (
            <span
              className={`absolute bottom-0 left-0 right-0 h-0.5 ${underlineClass}`}
            />
          )}
        </motion.div>
      </Link>
    );
  };

  const DropdownNavLink = ({ item }) => {
    const isActive = isDropdownActive(item.items);
    const Icon = item.icon;
    const isOpen = openDropdown === item.label;
    const menuId = `nav-menu-${item.label}`;

    const colorClasses = isActive
      ? "text-racing-neon"
      : "text-muted-foreground hover:text-foreground focus-visible:text-foreground";

    return (
      <div
        className="relative"
        onMouseEnter={() => setOpenDropdown(item.label)}
        onMouseLeave={() => setOpenDropdown(null)}
      >
        <button
          type="button"
          className={`relative flex items-center gap-1 px-4 py-2 font-racing text-sm uppercase tracking-wider transition-colors ${colorClasses}`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setOpenDropdown(isOpen ? null : item.label)}
          onKeyDown={(event) => {
            if (
              event.key === "ArrowDown" ||
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();
              setOpenDropdown(item.label);
            }
          }}
        >
          <Icon className="h-4 w-4" />
          {item.label}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-racing-neon" />
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={menuId}
              role="menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 pt-2 z-50"
            >
              <div className="min-w-[200px] bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg overflow-hidden">
                {item.items.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = location.pathname === subItem.path;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      role="menuitem"
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors outline-none focus-visible:bg-racing-lilac/10 focus-visible:text-racing-lilac ${
                        isSubActive
                          ? "bg-racing-neon/10 text-racing-neon"
                          : "text-muted-foreground hover:bg-racing-lilac/10 hover:text-racing-lilac"
                      }`}
                    >
                      <SubIcon className="h-4 w-4" />
                      {subItem.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const MobileMenuItem = ({ item }) => {
    if (item.type === "direct") {
      const isActive = location.pathname === item.path;
      const isLive = item.path === "/live";
      const Icon = item.icon;

      const colorClasses = isLive
        ? "text-red-500"
        : isActive
          ? "text-racing-neon"
          : "text-muted-foreground";

      return (
        <Link
          to={item.path}
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-4 py-3.5 min-h-[44px] font-racing text-sm uppercase tracking-wider transition-colors ${colorClasses} hover:bg-secondary`}
        >
          <Icon className="h-4 w-4" />
          {item.label}
        </Link>
      );
    }

    const isActive = isDropdownActive(item.items);
    const Icon = item.icon;
    const isOpen = mobileOpenCategory === item.label;

    return (
      <div>
        <button
          onClick={() => setMobileOpenCategory(isOpen ? null : item.label)}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 min-h-[44px] font-racing text-sm uppercase tracking-wider transition-colors ${
            isActive ? "text-racing-neon" : "text-muted-foreground"
          } hover:bg-secondary`}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            {item.label}
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-secondary/50"
            >
              {item.items.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = location.pathname === subItem.path;

                return (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 pl-12 pr-4 py-3.5 min-h-[44px] text-sm transition-colors ${
                      isSubActive
                        ? "text-racing-neon"
                        : "text-muted-foreground hover:text-racing-lilac"
                    }`}
                  >
                    <SubIcon className="h-4 w-4" />
                    {subItem.label}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-[hsl(261_89%_14%/0.78)] backdrop-blur-xl supports-[backdrop-filter]:bg-[hsl(261_89%_14%/0.68)]">
      <div className="container relative flex h-16 items-center justify-between py-1 sm:h-20 md:min-h-24">
        {/* Brand — static wordmark (no Supabase egress) */}
        <Link
          to="/"
          className="flex shrink-0 items-center"
          aria-label="Ric Team Racing"
        >
          <img
            src="/images/rtr_logo.png"
            alt="Ric Team Racing"
            width={1448}
            height={1086}
            className="h-14 w-auto sm:h-[4.5rem] md:h-20"
            decoding="async"
          />
        </Link>

        <nav
          ref={navRef}
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-1"
        >
          {navItems.map((item, index) => (
            <div key={index}>
              {item.type === "direct" ? (
                <DirectNavLink item={item} />
              ) : (
                <DropdownNavLink item={item} />
              )}
            </div>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-11 w-11"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden border-t border-border/60 bg-[hsl(261_89%_14%/0.92)] backdrop-blur-xl"
          >
            <div className="container py-4 space-y-1">
              {navItems.map((item, index) => (
                <MobileMenuItem key={index} item={item} />
              ))}

              <div className="pt-4 mt-4 border-t border-border space-y-1">
                {user ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
