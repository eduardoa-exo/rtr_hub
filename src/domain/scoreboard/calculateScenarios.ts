export interface ChampionshipStanding {
  car_number: string;
  team_name: string;
  points: number;
  rank: number;
  behind: number;
  class: string;
}

export interface RacePointsScale {
  position: number;
  points: number;
}

export interface ScenarioLine {
  condition_label: string;
  result_label: string;
  result_variant: "win" | "lose" | "neutral";
  class?: string;
}

export interface ScenarioContext {
  focus_car_number: string;
  rival_car_numbers: string[];
}

export interface ClassScenarios {
  class: string;
  focusStanding: ChampionshipStanding | null;
  rivalStandings: ChampionshipStanding[];
  scenarios: ScenarioLine[];
  gaps: Array<{
    rival: ChampionshipStanding;
    pointsGap: number;
  }>;
}

const DEFAULT_POINTS_SCALE: RacePointsScale[] = [
  { position: 1, points: 350 },
  { position: 2, points: 320 },
  { position: 3, points: 300 },
  { position: 4, points: 280 },
  { position: 5, points: 260 },
  { position: 6, points: 250 },
  { position: 7, points: 240 },
  { position: 8, points: 230 },
  { position: 9, points: 220 },
  { position: 10, points: 210 },
  { position: 11, points: 200 },
  { position: 12, points: 190 },
  { position: 13, points: 180 },
  { position: 14, points: 170 },
  { position: 15, points: 160 },
  { position: 16, points: 150 },
  { position: 17, points: 140 },
  { position: 18, points: 130 },
  { position: 19, points: 120 },
  { position: 20, points: 110 },
  { position: 21, points: 100 },
  { position: 22, points: 90 },
  { position: 23, points: 80 },
  { position: 24, points: 70 },
  { position: 25, points: 60 },
  { position: 26, points: 50 },
  { position: 27, points: 40 },
  { position: 28, points: 30 },
  { position: 29, points: 20 },
  { position: 30, points: 10 },
];

function normalizeCarNumber(carNumber: string): string {
  return carNumber.trim().replace(/^0+/, "");
}

function getPointsForPosition(position: number, scale: RacePointsScale[]): number {
  const entry = scale.find((s) => s.position === position);
  if (entry) return entry.points;
  return position > 30 ? 10 : 0;
}

function findCarInStandings(
  carNumber: string,
  standings: ChampionshipStanding[]
): ChampionshipStanding | null {
  const normalized = normalizeCarNumber(carNumber);
  return (
    standings.find((s) => normalizeCarNumber(s.car_number) === normalized) || null
  );
}

function calculateVariant(
  focusProjected: number,
  rivalProjected: number
): "win" | "lose" | "neutral" {
  if (focusProjected > rivalProjected) return "win";
  if (focusProjected < rivalProjected) return "lose";
  return "neutral";
}

function formatPosition(position: number): string {
  return `P${position}`;
}

function generateMeaningfulScenarios(
  focus: ChampionshipStanding,
  rival: ChampionshipStanding,
  scale: RacePointsScale[],
  className: string
): ScenarioLine[] {
  const scenarios: ScenarioLine[] = [];
  const pointsGap = rival.points - focus.points;

  const focusPositions = [1, 2, 3, 5, 10];
  const rivalPositions = [1, 2, 3, 5, 10, 15, 20];

  for (const focusPos of focusPositions) {
    for (const rivalPos of rivalPositions) {
      const focusProjected = focus.points + getPointsForPosition(focusPos, scale);
      const rivalProjected = rival.points + getPointsForPosition(rivalPos, scale);
      const variant = calculateVariant(focusProjected, rivalProjected);

      const isInteresting =
        variant === "win" ||
        (variant === "lose" && focusPos <= 3) ||
        variant === "neutral";

      if (isInteresting && scenarios.length < 8) {
        const condition = `Se o #${focus.car_number} acabar ${formatPosition(focusPos)} e o #${rival.car_number} ${formatPosition(rivalPos)} (${className})`;
        
        let result: string;
        if (variant === "win") {
          result = `#${focus.car_number} campeão`;
        } else if (variant === "lose") {
          result = `#${focus.car_number} não chega`;
        } else {
          result = "Empate em pontos";
        }

        scenarios.push({
          condition_label: condition,
          result_label: result,
          result_variant: variant,
          class: className,
        });
      }
    }
  }

  if (scenarios.length === 0) {
    const focusWins = focus.points + getPointsForPosition(1, scale);
    const rivalLast = rival.points + getPointsForPosition(30, scale);
    const variant = calculateVariant(focusWins, rivalLast);
    
    scenarios.push({
      condition_label: `Se o #${focus.car_number} vencer (${className})`,
      result_label: variant === "win" ? `#${focus.car_number} campeão` : `#${focus.car_number} não chega`,
      result_variant: variant,
      class: className,
    });
  }

  return scenarios.slice(0, 8);
}

export function calculateScenariosForClass(
  className: string,
  standings: ChampionshipStanding[],
  context: ScenarioContext,
  scale: RacePointsScale[]
): ClassScenarios {
  const classStandings = standings
    .filter((s) => s.class === className)
    .sort((a, b) => a.rank - b.rank);

  const focus = findCarInStandings(context.focus_car_number, classStandings);
  
  const rivals = context.rival_car_numbers
    .map((rn) => findCarInStandings(rn, classStandings))
    .filter((r): r is ChampionshipStanding => r !== null);

  const scenarios: ScenarioLine[] = [];
  const gaps: Array<{ rival: ChampionshipStanding; pointsGap: number }> = [];

  if (focus && rivals.length > 0) {
    for (const rival of rivals) {
      const pointsGap = rival.points - focus.points;
      gaps.push({ rival, pointsGap });

      const rivalScenarios = generateMeaningfulScenarios(
        focus,
        rival,
        scale,
        className
      );
      scenarios.push(...rivalScenarios);
    }
  }

  return {
    class: className,
    focusStanding: focus,
    rivalStandings: rivals,
    scenarios: scenarios.slice(0, 12),
    gaps,
  };
}

export function calculateAllScenarios(
  championshipClass: "LMP2" | "GT3 PRO" | "BOTH",
  standings: ChampionshipStanding[],
  context: ScenarioContext,
  scale?: RacePointsScale[]
): ClassScenarios[] {
  const effectiveScale = scale && scale.length > 0 ? scale : DEFAULT_POINTS_SCALE;

  const classes: string[] =
    championshipClass === "BOTH" ? ["LMP2", "GT3 PRO"] : [championshipClass];

  return classes.map((cls) =>
    calculateScenariosForClass(cls, standings, context, effectiveScale)
  );
}
