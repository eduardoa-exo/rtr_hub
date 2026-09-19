import type { LiveKpis } from "@/domain/scoreboard/projectLiveGrid";

interface ScoreboardKpisProps {
  kpis: LiveKpis;
}

function formatSigned(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

export function ScoreboardKpis({ kpis }: ScoreboardKpisProps) {
  const estadoTone =
    kpis.estadoCampeonato === "CAMPEÃO PROJETADO"
      ? "text-emerald-400"
      : "text-amber-400";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
        <div className="text-[10px] font-racing uppercase tracking-wider text-muted-foreground">
          Vantagem atual
        </div>
        <div className="mt-1 font-racing text-2xl font-bold tabular-nums">
          {formatSigned(kpis.vantagemAtual)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            pts
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
        <div className="text-[10px] font-racing uppercase tracking-wider text-muted-foreground">
          Vantagem projetada
        </div>
        <div className="mt-1 font-racing text-2xl font-bold tabular-nums">
          {formatSigned(kpis.vantagemProjetada)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            pts
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
        <div className="text-[10px] font-racing uppercase tracking-wider text-muted-foreground">
          Estado do campeonato
        </div>
        <div className={`mt-1 font-racing text-lg font-bold ${estadoTone}`}>
          {kpis.estadoCampeonato}
        </div>
      </div>
    </div>
  );
}
