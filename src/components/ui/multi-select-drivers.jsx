import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDrivers } from "@/hooks/queries/useDrivers";

export function MultiSelectDrivers({
  selectedIds,
  onChange,
  label = "Pilotos",
  filterIds,
}) {
  const { data: drivers = [], isLoading: loading } = useDrivers();

  const toggleDriver = (driverId) => {
    if (selectedIds.includes(driverId)) {
      onChange(selectedIds.filter((id) => id !== driverId));
    } else {
      onChange([...selectedIds, driverId]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="text-sm text-muted-foreground">
          A carregar pilotos...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        {label} ({selectedIds.length} selecionados)
      </Label>
      <ScrollArea className="h-48 rounded-md border border-input bg-secondary p-2">
        <div className="space-y-1">
          {(filterIds
            ? drivers.filter((d) => filterIds.includes(d.id))
            : drivers
          ).map((driver) => {
            const isSelected = selectedIds.includes(driver.id);
            return (
              <button
                key={driver.id}
                type="button"
                onClick={() => toggleDriver(driver.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center ${
                    isSelected
                      ? "bg-primary-foreground border-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{driver.name}</p>
                  {driver.category && (
                    <p className="text-xs opacity-80 truncate">
                      {driver.category}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
