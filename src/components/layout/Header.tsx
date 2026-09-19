import { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useScoreboardLiveSession } from "@/hooks/queries/useScoreboardLive";

// Types
type NavItemDirect = {
  type: "direct";
  path: string;
  label: string;
  icon: React.ElementType;
  conditional?: boolean;
};

type NavItemDropdown = {
  type: "dropdown";
  label: string;
  icon: React.ElementType;
  items: {
    path: string;
    label: string;
    icon: React.ElementType;
  }[];
};

type NavItem = NavItemDirect | NavItemDropdown;

// Navigation structure - without conditional items
const baseNavItems: NavItem[] = [
  { type: "direct", path: "/live", label: "Live", icon: Flag },
  { type: "direct", path: "/calendario", label: "Calendário", icon: Calendar },
  {
    type: "dropdown",
    label: "Competição",
    icon: Trophy,
    items: [
      { path: "/classificacao", label: "Classificação", icon: BarChart3 },
      { path: "/palmares", label: "Palmarés", icon: Trophy },
    ]
  },
  {
    type: "dropdown",
    label: "Equipa",
    icon: Users,
    items: [
      { path: "/pilotos", label: "Pilotos", icon: Users },
      { path: "/about", label: "Sobre Nós", icon: Info },
    ]
  },
  {
    type: "dropdown",
    label: "Comunidade",
    icon: Globe,
    items: [
      { path: "/redes", label: "Redes Sociais", icon: Globe },
      { path: "/faq", label: "FAQ", icon: HelpCircle },
      { path: "/contacts", label: "Contactos", icon: Mail },
    ]
  },
];

export function Header() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpenCategory, setMobileOpenCategory] = useState<string | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>(baseNavItems);
  const { data: liveSession } = useScoreboardLiveSession();
  const scoreboardEnabled = Boolean(liveSession?.enabled);

  // Update nav items when scoreboard session.enabled changes
  useEffect(() => {
    if (scoreboardEnabled) {
      const scoreboardItem: NavItemDirect = {
        type: "direct",
        path: "/scoreboard-live",
        label: "Scoreboard Live",
        icon: Trophy,
        conditional: true,
      };

      const liveIndex = baseNavItems.findIndex(
        (item) => item.type === "direct" && item.path === "/live"
      );

      const newNavItems = [...baseNavItems];
      newNavItems.splice(liveIndex + 1, 0, scoreboardItem);
      setNavItems(newNavItems);
    } else {
      setNavItems(baseNavItems);
    }
  }, [scoreboardEnabled]);

  // Check if any path in dropdown is active
  const isDropdownActive = (items: { path: string }[]) => {
    return items.some(item => location.pathname === item.path);
  };

  // Direct Link Component
  const DirectNavLink = ({ item }: { item: NavItemDirect }) => {
    const isActive = location.pathname === item.path;
    const isLive = item.path === "/live";
    const Icon = item.icon;

    const colorClasses = isLive
      ? isActive
        ? "text-red-500"
        : "text-red-500/80 hover:text-red-500"
      : isActive
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground";

    const underlineClass = isLive ? "bg-red-500" : "bg-primary";

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

  // Dropdown Component
  const DropdownNavLink = ({ item }: { item: NavItemDropdown }) => {
    const isActive = isDropdownActive(item.items);
    const Icon = item.icon;
    const isOpen = openDropdown === item.label;

    const colorClasses = isActive
      ? "text-primary"
      : "text-muted-foreground hover:text-foreground";

    const handleMouseEnter = () => {
      setOpenDropdown(item.label);
    };

    const handleMouseLeave = () => {
      setOpenDropdown(null);
    };

    return (
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className={`relative flex items-center gap-1 px-4 py-2 font-racing text-sm uppercase tracking-wider transition-colors cursor-pointer ${colorClasses}`}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          <Icon className="h-4 w-4" />
          {item.label}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
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
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        isSubActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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

  // Mobile Menu Item
  const MobileMenuItem = ({ item }: { item: NavItem }) => {
    if (item.type === "direct") {
      const isActive = location.pathname === item.path;
      const isLive = item.path === "/live";
      const Icon = item.icon;

      const colorClasses = isLive
        ? "text-red-500"
        : isActive
          ? "text-primary"
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

    // Dropdown in mobile
    const isActive = isDropdownActive(item.items);
    const Icon = item.icon;
    const isOpen = mobileOpenCategory === item.label;

    return (
      <div>
        <button
          onClick={() => setMobileOpenCategory(isOpen ? null : item.label)}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 min-h-[44px] font-racing text-sm uppercase tracking-wider transition-colors ${
            isActive ? "text-primary" : "text-muted-foreground"
          } hover:bg-secondary`}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            {item.label}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-[hsl(228_22%_5%/0.65)] backdrop-blur-xl supports-[backdrop-filter]:bg-[hsl(228_22%_5%/0.55)]">
      <div className="container relative flex h-16 items-center justify-between py-1 sm:h-20 md:min-h-24">
        {/* Brand */}
        <Link to="/" className="flex shrink-0 items-center">
          <span className="font-racing text-sm sm:text-base md:text-lg uppercase tracking-[0.15em] text-foreground">
            <span className="text-gradient-racing">RTR</span>{" "}
            <span className="hidden sm:inline font-light tracking-[0.2em] text-foreground/80">Racing</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-1">
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

        {/* Right Section */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-11 w-11"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden border-t border-border/60 bg-[hsl(228_22%_5%/0.88)] backdrop-blur-xl"
          >
            <div className="container py-4 space-y-1">
              {navItems.map((item, index) => (
                <MobileMenuItem key={index} item={item} />
              ))}

              {/* Mobile Auth Section */}
              <div className="pt-4 mt-4 border-t border-border space-y-1">
                {user ? (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Admin
                    </Link>
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
