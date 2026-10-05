/**
 * Dynamic Soil Fertility Engine for Indian Agriculture
 * Computes location-based soil fertility benchmarks dynamically using a ~250-300 km reference grid across India.
 * Grounded in ICAR, Soil Health Card (DAC&FW), and NBSS&LUP agricultural research data.
 */

const fs = require('fs');
const path = require('path');

const SOIL_DATA_PATH = path.join(__dirname, '..', 'data', 'dynamicSoilFertility.json');
let soilZones = [];

try {
  soilZones = JSON.parse(fs.readFileSync(SOIL_DATA_PATH, 'utf8'));
} catch (err) {
  console.error('Error reading dynamicSoilFertility.json:', err);
  soilZones = [];
}

/**
 * Calculates Great-Circle Distance between two coordinates in Kilometers using Haversine formula
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = deg => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Resolves approximate coordinates for Indian states and prominent agricultural districts
 */
const DISTRICT_COORDINATES = {
  // Punjab
  "ludhiana": { lat: 30.9010, lon: 75.8573, state: "Punjab" },
  "bathinda": { lat: 30.2110, lon: 74.9455, state: "Punjab" },
  "amritsar": { lat: 31.6340, lon: 74.8723, state: "Punjab" },
  "jalandhar": { lat: 31.3260, lon: 75.5762, state: "Punjab" },
  "patiala": { lat: 30.3398, lon: 76.3869, state: "Punjab" },
  "sangrur": { lat: 30.2447, lon: 75.8450, state: "Punjab" },
  // Haryana
  "karnal": { lat: 29.6857, lon: 76.9905, state: "Haryana" },
  "hisar": { lat: 29.1492, lon: 75.7217, state: "Haryana" },
  "rohtak": { lat: 28.8955, lon: 76.6066, state: "Haryana" },
  "sirsa": { lat: 29.5349, lon: 75.0289, state: "Haryana" },
  // Uttar Pradesh
  "meerut": { lat: 28.9845, lon: 77.7064, state: "Uttar Pradesh" },
  "muzaffarnagar": { lat: 29.4727, lon: 77.7085, state: "Uttar Pradesh" },
  "varanasi": { lat: 25.3176, lon: 82.9739, state: "Uttar Pradesh" },
  "agra": { lat: 27.1767, lon: 78.0081, state: "Uttar Pradesh" },
  "lucknow": { lat: 26.8467, lon: 80.9462, state: "Uttar Pradesh" },
  "gorakhpur": { lat: 26.7606, lon: 83.3732, state: "Uttar Pradesh" },
  "bareilly": { lat: 28.3670, lon: 79.4304, state: "Uttar Pradesh" },
  // Bihar
  "patna": { lat: 25.5941, lon: 85.1376, state: "Bihar" },
  "muzaffarpur": { lat: 26.1209, lon: 85.3647, state: "Bihar" },
  "gaya": { lat: 24.7914, lon: 85.0002, state: "Bihar" },
  "bhagalpur": { lat: 25.2425, lon: 86.9842, state: "Bihar" },
  // West Bengal
  "burdwan": { lat: 23.2324, lon: 87.8615, state: "West Bengal" },
  "bardhaman": { lat: 23.2324, lon: 87.8615, state: "West Bengal" },
  "nadia": { lat: 23.4710, lon: 88.5565, state: "West Bengal" },
  "murshidabad": { lat: 24.1759, lon: 88.2802, state: "West Bengal" },
  "malda": { lat: 25.0108, lon: 88.1411, state: "West Bengal" },
  // Assam
  "guwahati": { lat: 26.1445, lon: 91.7362, state: "Assam" },
  "kamrup": { lat: 26.1445, lon: 91.7362, state: "Assam" },
  "jorhat": { lat: 26.7509, lon: 94.2037, state: "Assam" },
  "dibrugarh": { lat: 27.4728, lon: 94.9120, state: "Assam" },
  // Madhya Pradesh
  "indore": { lat: 22.7196, lon: 75.8577, state: "Madhya Pradesh" },
  "ujjain": { lat: 23.1765, lon: 75.7885, state: "Madhya Pradesh" },
  "bhopal": { lat: 23.2599, lon: 77.4126, state: "Madhya Pradesh" },
  "gwalior": { lat: 26.2183, lon: 78.1828, state: "Madhya Pradesh" },
  "jabalpur": { lat: 23.1815, lon: 79.9864, state: "Madhya Pradesh" },
  "hoshangabad": { lat: 22.7519, lon: 77.7289, state: "Madhya Pradesh" },
  // Maharashtra
  "nashik": { lat: 19.9975, lon: 73.7898, state: "Maharashtra" },
  "pune": { lat: 18.5204, lon: 73.8567, state: "Maharashtra" },
  "nagpur": { lat: 21.1458, lon: 79.0882, state: "Maharashtra" },
  "aurangabad": { lat: 19.8762, lon: 75.3433, state: "Maharashtra" },
  "kolhapur": { lat: 16.7050, lon: 74.2433, state: "Maharashtra" },
  "solapur": { lat: 17.6599, lon: 75.9064, state: "Maharashtra" },
  "amravati": { lat: 20.9320, lon: 77.7523, state: "Maharashtra" },
  "ratnagiri": { lat: 16.9902, lon: 73.3120, state: "Maharashtra" },
  // Gujarat
  "rajkot": { lat: 22.3039, lon: 70.8022, state: "Gujarat" },
  "ahmedabad": { lat: 23.0225, lon: 72.5714, state: "Gujarat" },
  "surat": { lat: 21.1702, lon: 72.8311, state: "Gujarat" },
  "vadodara": { lat: 22.3072, lon: 73.1812, state: "Gujarat" },
  "junagadh": { lat: 21.5222, lon: 70.4579, state: "Gujarat" },
  // Rajasthan
  "jaipur": { lat: 26.9124, lon: 75.7873, state: "Rajasthan" },
  "jodhpur": { lat: 26.2389, lon: 73.0243, state: "Rajasthan" },
  "bikaner": { lat: 28.0229, lon: 73.3119, state: "Rajasthan" },
  "kota": { lat: 25.2138, lon: 75.8648, state: "Rajasthan" },
  "alwar": { lat: 27.5530, lon: 76.6346, state: "Rajasthan" },
  // Karnataka
  "belgaum": { lat: 15.8497, lon: 74.4977, state: "Karnataka" },
  "belagavi": { lat: 15.8497, lon: 74.4977, state: "Karnataka" },
  "bengaluru": { lat: 12.9716, lon: 77.5946, state: "Karnataka" },
  "bangalore": { lat: 12.9716, lon: 77.5946, state: "Karnataka" },
  "dharwad": { lat: 15.4589, lon: 75.0078, state: "Karnataka" },
  "mysuru": { lat: 12.2958, lon: 76.6394, state: "Karnataka" },
  "gulbarga": { lat: 17.3297, lon: 76.8343, state: "Karnataka" },
  // Telangana
  "warangal": { lat: 17.9689, lon: 79.5941, state: "Telangana" },
  "hyderabad": { lat: 17.3850, lon: 78.4867, state: "Telangana" },
  "karimnagar": { lat: 18.4386, lon: 79.1288, state: "Telangana" },
  "nizamabad": { lat: 18.6725, lon: 78.0941, state: "Telangana" },
  // Andhra Pradesh
  "guntur": { lat: 16.3067, lon: 80.4365, state: "Andhra Pradesh" },
  "vijayawada": { lat: 16.5062, lon: 80.6480, state: "Andhra Pradesh" },
  "anantapur": { lat: 14.6819, lon: 77.6006, state: "Andhra Pradesh" },
  "kurnool": { lat: 15.8281, lon: 78.0373, state: "Andhra Pradesh" },
  "visakhapatnam": { lat: 17.6868, lon: 83.2185, state: "Andhra Pradesh" },
  // Tamil Nadu
  "thanjavur": { lat: 10.7870, lon: 79.1378, state: "Tamil Nadu" },
  "coimbatore": { lat: 11.0168, lon: 76.9558, state: "Tamil Nadu" },
  "madurai": { lat: 9.9252, lon: 78.1198, state: "Tamil Nadu" },
  "chennai": { lat: 13.0827, lon: 80.2707, state: "Tamil Nadu" },
  "trichy": { lat: 10.7905, lon: 78.7047, state: "Tamil Nadu" },
  // Kerala
  "palakkad": { lat: 10.7867, lon: 76.6548, state: "Kerala" },
  "thrissur": { lat: 10.5276, lon: 76.2144, state: "Kerala" },
  "kottayam": { lat: 9.5916, lon: 76.5222, state: "Kerala" },
  // Odisha
  "cuttack": { lat: 20.4625, lon: 85.8828, state: "Odisha" },
  "bhubaneswar": { lat: 20.2961, lon: 85.8245, state: "Odisha" },
  "sambalpur": { lat: 21.4669, lon: 83.9812, state: "Odisha" },
  "balasore": { lat: 21.4934, lon: 86.9135, state: "Odisha" },
  // Chhattisgarh
  "raipur": { lat: 21.2514, lon: 81.6296, state: "Chhattisgarh" },
  "bilaspur": { lat: 22.0797, lon: 82.1409, state: "Chhattisgarh" },
  // Uttarakhand
  "pantnagar": { lat: 29.0222, lon: 79.4908, state: "Uttarakhand" },
  "dehradun": { lat: 30.3165, lon: 78.0322, state: "Uttarakhand" }
};

/**
 * Resolves coordinates based on input parameters (latitude/longitude, district, state)
 */
function resolveCoordinates(input = {}) {
  let lat = Number(input.latitude);
  let lon = Number(input.longitude);

  if (!isNaN(lat) && !isNaN(lon) && lat >= 6.0 && lat <= 38.0 && lon >= 68.0 && lon <= 98.0) {
    return { lat, lon, isExactGps: true };
  }

  const districtKey = String(input.district || '').toLowerCase().trim();
  if (districtKey && DISTRICT_COORDINATES[districtKey]) {
    return {
      lat: DISTRICT_COORDINATES[districtKey].lat,
      lon: DISTRICT_COORDINATES[districtKey].lon,
      isExactGps: false,
      matchedDistrict: input.district
    };
  }

  // Fallback by State Capital / Center
  const stateKey = String(input.state || '').toLowerCase().trim();
  const stateDefaults = {
    "punjab": { lat: 30.9010, lon: 75.8573 },
    "haryana": { lat: 29.6857, lon: 76.9905 },
    "uttar pradesh": { lat: 26.8467, lon: 80.9462 },
    "bihar": { lat: 25.5941, lon: 85.1376 },
    "west bengal": { lat: 23.2324, lon: 87.8615 },
    "assam": { lat: 26.1445, lon: 91.7362 },
    "madhya pradesh": { lat: 23.2599, lon: 77.4126 },
    "maharashtra": { lat: 19.9975, lon: 73.7898 },
    "gujarat": { lat: 22.3039, lon: 70.8022 },
    "rajasthan": { lat: 26.9124, lon: 75.7873 },
    "karnataka": { lat: 15.8497, lon: 74.4977 },
    "telangana": { lat: 17.9689, lon: 79.5941 },
    "andhra pradesh": { lat: 16.3067, lon: 80.4365 },
    "tamil nadu": { lat: 10.7870, lon: 79.1378 },
    "kerala": { lat: 10.7867, lon: 76.6548 },
    "odisha": { lat: 20.4625, lon: 85.8828 },
    "chhattisgarh": { lat: 21.2514, lon: 81.6296 },
    "uttarakhand": { lat: 29.0222, lon: 79.4908 }
  };

  if (stateKey && stateDefaults[stateKey]) {
    return {
      lat: stateDefaults[stateKey].lat,
      lon: stateDefaults[stateKey].lon,
      isExactGps: false,
      matchedState: input.state
    };
  }

  // General India National Center
  return { lat: 23.2599, lon: 77.4126, isExactGps: false };
}

/**
 * Retrieves dynamic soil fertility profile based on geographic coordinates (~300 km resolution)
 * @param {Object} input - { latitude, longitude, state, district }
 */
function getSoilFertilityProfile(input = {}) {
  const coords = resolveCoordinates(input);
  if (!soilZones || soilZones.length === 0) {
    return null;
  }

  // Find nearest zone using Haversine calculation
  let nearestZone = soilZones[0];
  let minDistance = Infinity;

  soilZones.forEach(zone => {
    const dist = calculateHaversineDistance(coords.lat, coords.lon, zone.latitude, zone.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestZone = zone;
    }
  });

  // Calculate dynamic micro-variations for precision:
  // e.g. subtle shift based on latitude gradient (+- 0.1 to 0.2 pH shift)
  const latOffset = Number(((coords.lat - nearestZone.latitude) * 0.05).toFixed(2));
  const dynamicPH = Number((nearestZone.pH + latOffset).toFixed(1));

  return {
    zoneId: nearestZone.id,
    zoneName: nearestZone.regionName,
    referenceStation: nearestZone.referenceCity,
    referenceState: nearestZone.state,
    distanceFromStationKm: minDistance,
    gridResolution: "300 km Agro-Ecological Grid",
    coordinates: { latitude: coords.lat, longitude: coords.lon },
    soilType: nearestZone.soilType,
    texture: nearestZone.texture,
    pH: dynamicPH,
    acidityRating: nearestZone.acidityRating,
    organicCarbon: nearestZone.organicCarbon,
    nitrogenKgHa: nearestZone.nitrogenKgHa,
    phosphorusKgHa: nearestZone.phosphorusKgHa,
    potassiumKgHa: nearestZone.potassiumKgHa,
    salinityEC: nearestZone.salinityEC,
    micronutrients: nearestZone.micronutrients,
    waterRetention: nearestZone.waterRetention,
    irrigationAvailability: nearestZone.irrigationAvailability,
    recommendedCrops: nearestZone.recommendedCrops,
    soilHealthAdvisory: nearestZone.advisory,
    dynamicBadge: minDistance <= 50
      ? `📍 Exact Station Match (${nearestZone.referenceCity} - ${minDistance} km)`
      : `📍 Regional Agro-Station (${nearestZone.referenceCity} - ${minDistance} km away, 300km Grid)`
  };
}

module.exports = {
  getSoilFertilityProfile,
  calculateHaversineDistance,
  resolveCoordinates
};
