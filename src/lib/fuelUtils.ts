/**
 * Pure utility functions for fuel economy calculations.
 * Extracted from FuelScreen to be independently testable.
 */

export interface FuelPoint {
  mileage: number | null;
  gallons: number | null;
  date?: string | null;
}

/**
 * Calculate average MPG across all fill-ups using total miles / total gallons.
 * Sorted by mileage ascending; consecutive differences give miles per tank.
 */
export function calculateAvgMpg(entries: FuelPoint[]): number {
  const sorted = [...entries]
    .filter(e => e.mileage != null && e.gallons != null)
    .sort((a, b) => (a.mileage ?? 0) - (b.mileage ?? 0));

  let totalMiles = 0;
  let totalGallons = 0;

  for (let i = 1; i < sorted.length; i++) {
    const miles = (sorted[i].mileage ?? 0) - (sorted[i - 1].mileage ?? 0);
    const gallons = sorted[i].gallons ?? 0;
    if (miles > 0 && gallons > 0) {
      totalMiles += miles;
      totalGallons += gallons;
    }
  }

  return totalGallons > 0 ? totalMiles / totalGallons : 0;
}

/**
 * Calculate per-fillup MPG for chart display.
 * Returns an array of { mpg, label } for each consecutive pair.
 */
export function calculateMpgSeries(entries: FuelPoint[]): Array<{ mpg: number; label: string }> {
  const sorted = [...entries]
    .filter(e => e.mileage != null && e.gallons != null)
    .sort((a, b) => (a.mileage ?? 0) - (b.mileage ?? 0));

  const series: Array<{ mpg: number; label: string }> = [];

  for (let i = 1; i < sorted.length; i++) {
    const miles = (sorted[i].mileage ?? 0) - (sorted[i - 1].mileage ?? 0);
    const gallons = sorted[i].gallons ?? 0;
    if (miles > 0 && gallons > 0) {
      const mpg = miles / gallons;
      const label = sorted[i].date ? sorted[i].date!.slice(5) : `#${i}`;
      series.push({ mpg: parseFloat(mpg.toFixed(1)), label });
    }
  }

  return series;
}
