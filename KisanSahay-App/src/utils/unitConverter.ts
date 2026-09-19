/**
 * Agricultural Land Unit Converter for India
 * Supports Acre, Hectare, Bigha (UP/MP/Punjab), Guntha (MH/KA), and Biswa
 */

export type LandUnit = 'acre' | 'hectare' | 'bigha' | 'guntha' | 'biswa';

// Factors to normalize to Acres
const UNIT_TO_ACRE: Record<LandUnit, number> = {
  acre: 1.0,
  hectare: 2.47105,
  bigha: 0.625,    // Standard Northern Bigha (~1.6 Bigha per acre)
  guntha: 0.025,   // 40 Guntha = 1 Acre (Maharashtra, Karnataka, Gujarat)
  biswa: 0.03125,  // 20 Biswa = 1 Bigha (~32 Biswa per acre)
};

export function convertLandArea(area: number, fromUnit: LandUnit, toUnit: LandUnit): number {
  if (isNaN(area) || area <= 0) return 0;
  if (fromUnit === toUnit) return Number(area.toFixed(2));

  // Convert to acres first
  const inAcres = area * (UNIT_TO_ACRE[fromUnit] || 1.0);
  
  // Convert acres to target unit
  const inTarget = inAcres / (UNIT_TO_ACRE[toUnit] || 1.0);
  return Number(inTarget.toFixed(2));
}

export function formatLandArea(area: number, unit: LandUnit): string {
  const labels: Record<LandUnit, string> = {
    acre: 'Acres',
    hectare: 'Hectares',
    bigha: 'Bigha',
    guntha: 'Guntha',
    biswa: 'Biswa',
  };
  return `${area} ${labels[unit] || 'Acres'}`;
}
