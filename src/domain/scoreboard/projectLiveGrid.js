/**
 * Scoreboard Live projection math (pure, in-memory).
 * Never mutates championship_standings — baseline points are read-only.
 */

export const FOCUS_TEAM_NAME = "ric team racing";

export function normalizeCarNumber(carNumber) {
  return carNumber.trim().replace(/^0+/, "") || "0";
}

export function isFocusTeam(teamName) {
  return (teamName ?? "").trim().toLowerCase() === FOCUS_TEAM_NAME;
}

export function pointsForPosition(position, scaleRows, className) {
  if (position < 1) return 0;
  const classRules = scaleRows.filter((r) => r.class === className);
  const lookup = position > 30 ? 30 : position;
  const rule = classRules.find((r) => r.position === lookup);
  return rule?.points ?? 0;
}

function standingKey(className, carNumber) {
  return `${className}::${normalizeCarNumber(carNumber)}`;
}

export function projectLiveGrid(gridRows, standings, scaleRows, className) {
  const standingByCar = new Map();
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
      diferenca: 0,
      isFocus,
    };
  });

  const participating = projected.filter((r) => r.participates);
  const leaderProjetado =
    participating.length > 0
      ? Math.max(...participating.map((r) => r.projetado))
      : 0;

  const rows = projected.map((r) => {
    if (r.participates && r.projetado === leaderProjetado) {
      return { ...r, diferenca: "Líder" };
    }
    return { ...r, diferenca: r.projetado - leaderProjetado };
  });

  const focus = rows.find((r) => r.isFocus) ?? null;
  const othersParticipating = participating.filter(
    (r) =>
      normalizeCarNumber(r.car_number) !==
      normalizeCarNumber(focus?.car_number ?? ""),
  );

  let vantagemAtual = 0;
  let vantagemProjetada = 0;
  let estadoCampeonato = "POSIÇÃO INSUFICIENTE";

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
        normalizeCarNumber(focus.car_number),
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
