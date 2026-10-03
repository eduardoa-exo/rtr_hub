import { useMemo, type ComponentType } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import * as Flags from "country-flag-icons/react/3x2";
import { Switch } from "@/components/ui/switch";
import type { ProjectedLiveRow } from "@/domain/scoreboard/projectLiveGrid";
import { cn } from "@/lib/utils";

const FLAG_COMPONENTS = Flags as Record<
  string,
  ComponentType<{ className?: string }>
>;
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
  EN: "GB",
  USA: "US",
};

const INVERTED_BRANDS = ["mclaren", "acura", "aston"];

function shouldInvertLogo(logoUrl: string | null): boolean {
  if (!logoUrl) return false;
  const lower = logoUrl.toLowerCase();
  return INVERTED_BRANDS.some((b) => lower.includes(b));
}

function renderFlag(countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }
  const resolved = COUNTRY_CODE_ALIASES[normalized] ?? normalized;
  const Flag = FLAG_COMPONENTS[resolved];
  if (!Flag) {
    return <span className="text-xs">{resolved}</span>;
  }
  return <Flag className="h-4 w-6 rounded-sm" />;
}

interface ScoreboardLiveGridProps {
  rows: ProjectedLiveRow[];
  isAdmin: boolean;
  onReorder: (orderedCarNumbers: string[]) => void;
  onToggleParticipates: (id: string, participates: boolean) => void;
  busy?: boolean;
}

function SortableRow({
  row,
  isAdmin,
  onToggleParticipates,
  busy,
}: {
  row: ProjectedLiveRow;
  isAdmin: boolean;
  onToggleParticipates: (id: string, participates: boolean) => void;
  busy?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const diff =
    row.diferenca === "Líder" ? (
      <span className="text-emerald-400 font-semibold">Líder</span>
    ) : (
      <span
        className={cn(
          "tabular-nums",
          row.diferenca < 0 ? "text-red-400" : "text-muted-foreground"
        )}
      >
        {row.diferenca > 0 ? `+${row.diferenca}` : row.diferenca}
      </span>
    );

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-border group",
        row.isFocus &&
          "relative bg-accent/50 border-l-2 border-l-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]",
        !row.participates && "opacity-55",
        isDragging && "bg-card/80 z-10 shadow-lg"
      )}
    >
      {isAdmin && (
        <td className="py-2 px-1 w-8">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
            aria-label="Arrastar posição"
            disabled={busy}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="py-2 px-2 font-bold tabular-nums text-sm">
        {row.sort_order}
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-primary-foreground bg-primary rounded shrink-0">
            {row.car_number}
          </span>
          {row.car_logo_url ? (
            <img
              src={row.car_logo_url}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                "hidden sm:block h-7 w-7 object-contain shrink-0",
                shouldInvertLogo(row.car_logo_url) && "brightness-0 invert"
              )}
            />
          ) : null}
          <span className="hidden sm:inline-flex items-center shrink-0">
            {renderFlag(row.country_code)}
          </span>
          <span className="text-xs sm:text-sm truncate max-w-[8rem] sm:max-w-[14rem]">
            {row.teamDisplay}
          </span>
        </div>
      </td>
      <td className="hidden sm:table-cell py-2 px-2 text-center">
        {isAdmin ? (
          <Switch
            checked={row.participates}
            disabled={busy}
            onCheckedChange={(checked) =>
              onToggleParticipates(row.id, checked)
            }
            aria-label={`Participa #${row.car_number}`}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {row.participates ? "Sim" : "Não"}
          </span>
        )}
      </td>
      <td className="hidden md:table-cell py-2 px-2 text-center font-bold text-sm tabular-nums">
        {row.pontosAtuais}
      </td>
      <td className="hidden lg:table-cell py-2 px-2 text-center text-sm tabular-nums">
        {row.posCampeonato || "—"}
      </td>
      <td className="hidden md:table-cell py-2 px-2 text-center text-sm tabular-nums">
        {row.ptsCorrida}
      </td>
      <td className="py-2 px-2 text-center font-bold text-sm tabular-nums">
        {row.projetado}
      </td>
      <td className="hidden sm:table-cell py-2 px-2 text-center text-sm">{diff}</td>
    </tr>
  );
}

export function ScoreboardLiveGridTable({
  rows,
  isAdmin,
  onReorder,
  onToggleParticipates,
  busy,
}: ScoreboardLiveGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ids = useMemo(() => rows.map((r) => r.id), [rows]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isAdmin) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(rows, oldIndex, newIndex);
    onReorder(next.map((r) => r.car_number));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full border-collapse min-w-0 md:min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-card/30">
              {isAdmin && (
                <th className="w-8 py-3 px-1 text-xs font-racing uppercase tracking-wider" />
              )}
              <th className="text-left py-2.5 px-2 text-[10px] sm:text-xs font-racing uppercase tracking-wider">
                Pos
              </th>
              <th className="text-left py-2.5 px-2 text-[10px] sm:text-xs font-racing uppercase tracking-wider">
                Equipa
              </th>
              <th className="hidden sm:table-cell text-center py-3 px-2 text-xs font-racing uppercase tracking-wider">
                Participa
              </th>
              <th className="hidden md:table-cell text-center py-3 px-2 text-xs font-racing uppercase tracking-wider">
                Pontos atuais
              </th>
              <th className="hidden lg:table-cell text-center py-3 px-2 text-xs font-racing uppercase tracking-wider">
                Pos. campeonato
              </th>
              <th className="hidden md:table-cell text-center py-3 px-2 text-xs font-racing uppercase tracking-wider">
                Pts. corrida
              </th>
              <th className="text-center py-2.5 px-2 text-[10px] sm:text-xs font-racing uppercase tracking-wider">
                Proj.
              </th>
              <th className="hidden sm:table-cell text-center py-3 px-2 text-xs font-racing uppercase tracking-wider">
                Diferença
              </th>
            </tr>
          </thead>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <tbody>
              {rows.map((row) => (
                <SortableRow
                  key={row.id}
                  row={row}
                  isAdmin={isAdmin}
                  onToggleParticipates={onToggleParticipates}
                  busy={busy}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}
