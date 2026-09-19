/**
 * Scoreboard Live projection math (pure, in-memory).
 * Never mutates championship_standings — baseline points are read-only.
 */

export const FOCUS_TEAM_NAME = "ric team racing";

export type ChampionshipClass = "LMP2" | "GT3 PRO";

export interface StandingBaseline {
  car_number: string;
  team_name: string;
  points: number;
  rank: number;
  class: string;
  country_code?: string | null;
  car_logo_url?: string | null;
}

export interface LiveGridRow {
  id: string;
  class: string;
  car_number: string;
  sort_order: number;
  participates: boolean;
  team_name: string | null;
  country_code: string | null;
  car_logo_url: string | null;
}

export interface RacePointsScaleRow {
  class: string;
  position: number;
  points: number;
}

export interface ProjectedLiveRow extends LiveGridRow {
  teamDisplay: string;
  pontosAtuais: number;
  posCampeonato: number;
  ptsCorrida: number;
  projetado: number;
  /** Leader label or negative gap vs leader projetado among participating rows */
  diferenca: number | "Líder";
  isFocus: boolean;
}

export interface LiveKpis {
  vantagemAtual: number;
  vantagemProjetada: number;
  estadoCampeonato: "CAMPEÃO PROJETADO" | "POSIÇÃO INSUFICIENTE";
  focusCarNumber: string | null;
  focusTeamName: string | null;
}

export function normalizeCarNumber(carNumber: string): string {
  return carNumber.trim().replace(/^0+/, "") || "0";
}

export function isFocusTeam(teamName: string | null | undefined): boolean {
  return (teamName ?? "").trim().toLowerCase() === FOCUS_TEAM_NAME;
}

export function pointsForPosition(
  position: number,
  scaleRows: RacePointsScaleRow[],
  className: string
): number {
  if (position < 1) return 0;
  const classRules = scaleRows.filter((r) => r.class === className);
  const lookup = position > 30 ? 30 : position;
  const rule = classRules.find((r) => r.position === lookup);
  return rule?.points ?? 0;
}

function standingKey(className: string, carNumber: string): string {
  return `${className}::${normalizeCarNumber(carNumber)}`;
}

export function projectLiveGrid(
  gridRows: LiveGridRow[],
  standings: StandingBaseline[],
  scaleRows: RacePointsScaleRow[],
  className: ChampionshipClass
): { rows: ProjectedLiveRow[]; kpis: LiveKpis } {
  const standingByCar = new Map<string, StandingBaseline>();
  for (const s of standings) {
    if (s.class !== className) continue;
    standingByCar.set(standingKey(s.class, s.car_number), s);
  }

  const sorted = [...gridRows]
    .filter((r) => r.class === className)
    .sort((a, b) => a.sort_order - b.sort_order);

  const projected = sorted.map((row) => {
    const standing = standingByCar.get(standingKey(row.class, row.car_number));
    const teamDisplay = row.team_name ?? standing?.team_name ?? "—";
    const pontosAtuais = standing?.points ?? 0;
    const posCampeonato = standing?.rank ?? 0;
    const ptsCorrida = row.participates
      ? pointsForPosition(row.sort_order, scaleRows, className)
      : 0;
    const projetado = pontosAtuais + ptsCorrida;
    const isFocus = isFocusTeam(teamDisplay);

    return {
      ...row,
      team_name: row.team_name ?? standing?.team_name ?? null,
      country_code: row.country_code ?? standing?.country_code ?? null,
      car_logo_url: row.car_logo_url ?? standing?.car_logo_url ?? null,
      teamDisplay,
      pontosAtuais,
      posCampeonato,
      ptsCorrida,
      projetado,
      diferenca: 0 as number | "Líder",
      isFocus,
    } satisfies ProjectedLiveRow;
  });

  const participating = projected.filter((r) => r.participates);
  const leaderProjetado =
    participating.length > 0
      ? Math.max(...participating.map((r) => r.projetado))
      : 0;

  const rows: ProjectedLiveRow[] = projected.map((r) => {
    if (r.participates && r.projetado === leaderProjetado) {
      return { ...r, diferenca: "Líder" as const };
    }
    return { ...r, diferenca: r.projetado - leaderProjetado };
  });

  const focus = rows.find((r) => r.isFocus) ?? null;
  const othersParticipating = participating.filter(
    (r) => normalizeCarNumber(r.car_number) !== normalizeCarNumber(focus?.car_number ?? "")
  );

  let vantagemAtual = 0;
  let vantagemProjetada = 0;
  let estadoCampeonato: LiveKpis["estadoCampeonato"] = "POSIÇÃO INSUFICIENTE";

  if (focus) {
    const bestOtherAtual =
      othersParticipating.length > 0
        ? Math.max(...othersParticipating.map((r) => r.pontosAtuais))
        : 0;
    const bestOtherProj =
      othersParticipating.length > 0
        ? Math.max(...othersParticipating.map((r) => r.projetado))
        : 0;

    vantagemAtual = focus.pontosAtuais - bestOtherAtual;
    vantagemProjetada = focus.projetado - bestOtherProj;

    const othersAll = rows.filter(
      (r) =>
        normalizeCarNumber(r.car_number) !==
        normalizeCarNumber(focus.car_number)
    );
    const strictLead =
      othersAll.length === 0 ||
      focus.projetado > Math.max(...othersAll.map((r) => r.projetado));

    estadoCampeonato = strictLead
      ? "CAMPEÃO PROJETADO"
      : "POSIÇÃO INSUFICIENTE";
  }

  return {
    rows,
    kpis: {
      vantagemAtual,
      vantagemProjetada,
      estadoCampeonato,
      focusCarNumber: focus?.car_number ?? null,
      focusTeamName: focus?.teamDisplay ?? null,
    },
  };
}
