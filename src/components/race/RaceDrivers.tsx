import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useDrivers } from "@/hooks/queries/useDrivers";
import { mediaUrl } from "@/lib/mediaUrl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Driver = Database["public"]["Tables"]["drivers"]["Row"];

interface RaceDriversProps {
  driverIds?: string[] | null;
  driverGroups?: Record<string, string[]> | null;
}

function DriverCard({ driver, onClick, compact = false }: { driver: Driver; onClick: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 p-2 md:p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
        onClick={onClick}
      >
        {driver.image_url ? (
          <img
            src={mediaUrl(driver.image_url)}
            alt={driver.name}
            loading="lazy"
            decoding="async"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover border-2 border-primary/20"
          />
        ) : (
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-racing font-bold text-sm md:text-base truncate">{driver.name}</p>
          {driver.known_as && (
            <p className="text-xs text-muted-foreground truncate">"{driver.known_as}"</p>
          )}
          {driver.category && (
            <p className="text-xs font-racing uppercase tracking-wider text-primary/80">{driver.category}</p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
      onClick={onClick}
    >
      {driver.image_url ? (
        <img
          src={mediaUrl(driver.image_url)}
          alt={driver.name}
          loading="lazy"
          decoding="async"
          className="h-14 w-14 rounded-full object-cover border-2 border-primary/20"
        />
      ) : (
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
          <Users className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-racing font-bold text-base truncate">{driver.name}</p>
        {driver.known_as && (
          <p className="text-sm text-muted-foreground truncate">"{driver.known_as}"</p>
        )}
        {driver.category && (
          <p className="text-xs font-racing uppercase tracking-wider text-primary/80">{driver.category}</p>
        )}
      </div>
    </motion.div>
  );
}

export function RaceDrivers({ driverIds, driverGroups }: RaceDriversProps) {
  const { data: cachedDrivers = [], isLoading: cacheLoading } = useDrivers();
  const [expanded, setExpanded] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const drivers = driverIds
    ? cachedDrivers.filter((driver) => driverIds.includes(driver.id))
    : [];
  const loading = cacheLoading;

  if (loading) {
    return (
      <div className="card-racing p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!driverIds || driverIds.length === 0 || drivers.length === 0) {
    return (
      <div className="card-racing p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-racing text-base uppercase tracking-wider">Pilotos</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum piloto definido para esta corrida
        </p>
      </div>
    );
  }

  const driverMap = Object.fromEntries(drivers.map((d) => [d.id, d]));

  // Build group sections when driverGroups is defined and has entries
  const groups = driverGroups && Object.keys(driverGroups).length > 0
    ? Object.entries(driverGroups)
    : null;

  // IDs already placed in a group
  const groupedIds = groups ? new Set(groups.flatMap(([, ids]) => ids)) : new Set<string>();

  // Drivers not assigned to any group
  const ungroupedDrivers = drivers.filter((d) => !groupedIds.has(d.id));

  return (
    <motion.div layout className="card-racing p-4 md:p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 mb-4"
      >
        <span className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-racing text-base md:text-lg uppercase tracking-wider">
            Pilotos ({drivers.length})
          </span>
        </span>
        <span className="text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {groups ? (
              <div className="space-y-4">
                {groups.map(([groupName, ids]) => {
                  const groupDrivers = ids.map((id) => driverMap[id]).filter(Boolean);
                  if (groupDrivers.length === 0) return null;
                  return (
                    <div key={groupName}>
                      <p className="text-xs font-racing uppercase tracking-widest text-primary mb-2 pl-1">
                        {groupName}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {groupDrivers.map((driver) => (
                          <DriverCard
                            key={driver.id}
                            driver={driver}
                            onClick={() => setSelectedDriver(driver)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {ungroupedDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-racing uppercase tracking-widest text-muted-foreground mb-2 pl-1">
                      Outros
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ungroupedDrivers.map((driver) => (
                        <DriverCard
                          key={driver.id}
                          driver={driver}
                          onClick={() => setSelectedDriver(driver)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {drivers.map((driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    onClick={() => setSelectedDriver(driver)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {groups ? (
              <div className="space-y-4">
                {groups.map(([groupName, ids]) => {
                  const groupDrivers = ids.map((id) => driverMap[id]).filter(Boolean);
                  if (groupDrivers.length === 0) return null;
                  return (
                    <div key={groupName}>
                      <p className="text-xs font-racing uppercase tracking-widest text-primary mb-2 pl-1">
                        {groupName}
                      </p>
                      <div className="space-y-2 md:space-y-3">
                        {groupDrivers.map((driver) => (
                          <DriverCard
                            key={driver.id}
                            driver={driver}
                            compact
                            onClick={() => setSelectedDriver(driver)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {ungroupedDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-racing uppercase tracking-widest text-muted-foreground mb-2 pl-1">
                      Outros
                    </p>
                    <div className="space-y-2 md:space-y-3">
                      {ungroupedDrivers.map((driver) => (
                        <DriverCard
                          key={driver.id}
                          driver={driver}
                          compact
                          onClick={() => setSelectedDriver(driver)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {drivers.map((driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    compact
                    onClick={() => setSelectedDriver(driver)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-racing">Piloto</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="h-32 w-32 sm:h-40 sm:w-40 md:h-56 md:w-56 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary/50 flex items-center justify-center shrink-0">
                {selectedDriver.image_url ? (
                  <img
                    src={mediaUrl(selectedDriver.image_url)}
                    alt={selectedDriver.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Users className="h-16 w-16 text-primary" />
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-racing text-2xl font-bold">{selectedDriver.name}</h3>
                {selectedDriver.known_as && (
                  <p className="text-muted-foreground mt-1">"{selectedDriver.known_as}"</p>
                )}
                {selectedDriver.category && (
                  <p className="mt-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-racing uppercase tracking-wider text-primary">
                    {selectedDriver.category}
                  </p>
                )}
                {selectedDriver.instagram && (
                  <div className="mt-4">
                    <a
                      href={
                        selectedDriver.instagram.startsWith("http")
                          ? selectedDriver.instagram
                          : `https://instagram.com/${selectedDriver.instagram.replace("@", "")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#E4405F] hover:text-[#E4405F]/80 transition-colors"
                    >
                      <img
                        src="/images/instagram.png"
                        alt="Instagram"
                        className="h-4 w-4 shrink-0"
                      />
                      <span>@{selectedDriver.instagram.replace("@", "")}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
