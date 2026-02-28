import { calculateAvgMpg, calculateMpgSeries, FuelPoint } from '../lib/fuelUtils';

describe('calculateAvgMpg', () => {
  it('returns 0 for empty input', () => {
    expect(calculateAvgMpg([])).toBe(0);
  });

  it('returns 0 for a single entry (no consecutive pair)', () => {
    const entries: FuelPoint[] = [{ mileage: 10000, gallons: 10 }];
    expect(calculateAvgMpg(entries)).toBe(0);
  });

  it('returns 0 when gallons total to 0', () => {
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 0 },
      { mileage: 10300, gallons: 0 },
    ];
    expect(calculateAvgMpg(entries)).toBe(0);
  });

  it('calculates correct MPG for two entries', () => {
    // 300 miles on 10 gallons = 30 MPG
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10 },
      { mileage: 10300, gallons: 10 },
    ];
    expect(calculateAvgMpg(entries)).toBeCloseTo(30, 1);
  });

  it('calculates total-miles / total-gallons across multiple fill-ups', () => {
    // Fill-up 2: 300 miles / 10 gal = 30 MPG
    // Fill-up 3: 250 miles / 8 gal  = 31.25 MPG
    // Aggregate: 550 miles / 18 gal ≈ 30.56 MPG
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10 },
      { mileage: 10300, gallons: 10 },
      { mileage: 10550, gallons: 8 },
    ];
    expect(calculateAvgMpg(entries)).toBeCloseTo(550 / 18, 4);
  });

  it('handles entries provided out of mileage order', () => {
    const entries: FuelPoint[] = [
      { mileage: 10300, gallons: 10 },
      { mileage: 10000, gallons: 10 }, // out of order
    ];
    expect(calculateAvgMpg(entries)).toBeCloseTo(30, 1);
  });

  it('skips entries with null mileage', () => {
    const entries: FuelPoint[] = [
      { mileage: null, gallons: 10 },
      { mileage: 10000, gallons: 10 },
      { mileage: 10300, gallons: 10 },
    ];
    // null entry filtered out; 300 miles / 10 gal = 30
    expect(calculateAvgMpg(entries)).toBeCloseTo(30, 1);
  });

  it('skips entries with null gallons', () => {
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: null },
      { mileage: 10300, gallons: 10 },
      { mileage: 10600, gallons: 10 },
    ];
    // null entry filtered out; 300 miles / 10 gal = 30 for the one remaining pair
    expect(calculateAvgMpg(entries)).toBeCloseTo(30, 1);
  });

  it('skips consecutive pairs where miles difference is 0 or negative', () => {
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10 },
      { mileage: 10000, gallons: 5 }, // same mileage — no miles driven
      { mileage: 10300, gallons: 10 },
    ];
    // Only the 10000→10300 pair counts: 300 / 10 = 30
    expect(calculateAvgMpg(entries)).toBeCloseTo(30, 1);
  });
});

describe('calculateMpgSeries', () => {
  it('returns empty array for empty input', () => {
    expect(calculateMpgSeries([])).toEqual([]);
  });

  it('returns empty array for a single entry', () => {
    expect(calculateMpgSeries([{ mileage: 10000, gallons: 10 }])).toEqual([]);
  });

  it('returns one data point for two entries', () => {
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10, date: '2026-01-15' },
      { mileage: 10300, gallons: 10, date: '2026-02-01' },
    ];
    const result = calculateMpgSeries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].mpg).toBeCloseTo(30, 1);
  });

  it('uses date slice (MM-DD) as label when date present', () => {
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10, date: '2026-01-15' },
      { mileage: 10300, gallons: 10, date: '2026-02-01' },
    ];
    const result = calculateMpgSeries(entries);
    expect(result[0].label).toBe('02-01');
  });

  it('uses #N index as label when no date', () => {
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10 },
      { mileage: 10300, gallons: 10 },
    ];
    const result = calculateMpgSeries(entries);
    expect(result[0].label).toBe('#1');
  });

  it('rounds MPG to one decimal place', () => {
    // 100 miles / 3 gallons = 33.333... → rounds to 33.3
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10 },
      { mileage: 10100, gallons: 3 },
    ];
    const result = calculateMpgSeries(entries);
    expect(result[0].mpg).toBe(33.3);
  });

  it('returns a data point per consecutive pair', () => {
    const entries: FuelPoint[] = [
      { mileage: 10000, gallons: 10, date: '2026-01-01' },
      { mileage: 10300, gallons: 10, date: '2026-01-15' },
      { mileage: 10550, gallons: 8, date: '2026-02-01' },
    ];
    const result = calculateMpgSeries(entries);
    expect(result).toHaveLength(2);
    expect(result[0].mpg).toBe(30.0);
    expect(result[1].mpg).toBe(31.3); // 250/8 = 31.25, rounded to 1dp = 31.3
  });

  it('filters null mileage/gallons entries before computing', () => {
    const entries: FuelPoint[] = [
      { mileage: null, gallons: 10, date: '2025-12-01' },
      { mileage: 10000, gallons: 10, date: '2026-01-01' },
      { mileage: 10300, gallons: 10, date: '2026-02-01' },
    ];
    const result = calculateMpgSeries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].mpg).toBe(30.0);
  });
});
