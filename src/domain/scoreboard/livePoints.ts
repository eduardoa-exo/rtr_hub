/**
 * Live Scoreboard Points Calculation
 * 
 * Pure functions to compute championship points from live race positions.
 * Uses race_points_scale table (position 1-30, position > 30 uses position 30 value).
 */

export interface RacePointsScale {
  class: 'LMP2' | 'GT3 PRO';
  position: number;
  points: number;
}

/**
 * Calculate points awarded for a given finishing position.
 * 
 * @param position - Finishing position (1-indexed, e.g., 1 = P1)
 * @param scaleRows - Points scale rules from race_points_scale table
 * @param className - Class filter (LMP2 | GT3 PRO)
 * @returns Points awarded for this position
 * 
 * @example
 * // P1 with official scale
 * pointsForPosition(1, scaleRows, 'LMP2') // => 350
 * 
 * // P31 uses P30 value
 * pointsForPosition(31, scaleRows, 'GT3 PRO') // => 10
 */
export function pointsForPosition(
  position: number,
  scaleRows: RacePointsScale[],
  className: 'LMP2' | 'GT3 PRO'
): number {
  if (position < 1) return 0;

  // Filter rules for the specified class
  const classRules = scaleRows.filter((rule) => rule.class === className);

  // For positions > 30, use position 30 value
  const lookupPosition = position > 30 ? 30 : position;

  // Find exact position match
  const rule = classRules.find((r) => r.position === lookupPosition);

  return rule ? rule.points : 0;
}

/**
 * Compute live points for all cars in the grid.
 * 
 * @param gridRows - Live grid entries with car_number, sort_order, and class
 * @param scaleRows - Points scale rules
 * @returns Map of car_number => points
 */
export function computeLivePoints(
  gridRows: Array<{ car_number: string; sort_order: number; class: string }>,
  scaleRows: RacePointsScale[]
): Map<string, number> {
  const pointsMap = new Map<string, number>();

  for (const row of gridRows) {
    // Use grid row's class to look up points
    const carClass = row.class as 'LMP2' | 'GT3 PRO';
    const points = pointsForPosition(row.sort_order, scaleRows, carClass);
    pointsMap.set(row.car_number, points);
  }

  return pointsMap;
}
