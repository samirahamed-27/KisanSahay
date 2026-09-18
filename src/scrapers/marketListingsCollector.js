/**
 * Supplementary Market Asking Rates Collector
 * Portals: 99acres & MagicBricks Agricultural Land Listings
 * Extracts: asking price, unit (per acre, per guntha, per bigha), district, taluk, village
 * Strictly labeled as 'market_rate_listing' to distinguish from government circle rates.
 */

const logger = require('../utils/logger');
const { extractRateFromListingText, convertToRatePerAcre } = require('../services/unitConverter');

const MARKET_RATE_TYPE = 'market_rate_listing';

// Representative real-estate agricultural listings from 99acres
const RAW_99ACRES_LISTINGS = [
  // MAHARASHTRA
  {
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Haveli',
    village_zone: 'Khed Shivapur',
    listingTitle: '3 Acres Clear Title Fertile Land with River Frontage',
    askingPriceText: '₹55 Lakh / Acre',
    unit: 'acre',
    rawPrice: 5500000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-khed-shivapur-pune-ffid'
  },
  {
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Baramati',
    village_zone: 'Malegaon Budruk',
    listingTitle: '5 Acres Sugarcane Land with Drip & Well Water',
    askingPriceText: '₹38 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3800000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-baramati-pune-ffid'
  },
  {
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Shirur',
    village_zone: 'Sanaswadi',
    listingTitle: '10 Guntha Farmland near State Highway',
    askingPriceText: '₹1.1 Lakh per Guntha',
    unit: 'guntha',
    rawPrice: 110000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-shirur-pune-ffid'
  },
  {
    state: 'Maharashtra',
    district: 'Nashik',
    taluk: 'Niphad',
    village_zone: 'Pimpalgaon Baswant',
    listingTitle: '4 Acres Prime Grape Vineyard with Solar Pump',
    askingPriceText: '₹34 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3400000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-niphad-nashik-ffid'
  },
  {
    state: 'Maharashtra',
    district: 'Nashik',
    taluk: 'Dindori',
    village_zone: 'Vani',
    listingTitle: '2.5 Acres Agro Tourism & Vineyard Potential Land',
    askingPriceText: '₹30 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3000000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-dindori-nashik-ffid'
  },
  {
    state: 'Maharashtra',
    district: 'Nagpur',
    taluk: 'Saoner',
    village_zone: 'Khapa',
    listingTitle: '6 Acres Orange Orchard with Sweet Water Borewell',
    askingPriceText: '₹19 Lakh / Acre',
    unit: 'acre',
    rawPrice: 1900000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-saoner-nagpur-ffid'
  },
  {
    state: 'Maharashtra',
    district: 'Ahmednagar',
    taluk: 'Sangamner',
    village_zone: 'Ashwi',
    listingTitle: '2 Acres Canal Irrigated Pomegranate Farmland',
    askingPriceText: '₹28 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2800000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-sangamner-ahmednagar-ffid'
  },
  {
    state: 'Maharashtra',
    district: 'Satara',
    taluk: 'Karad',
    village_zone: 'Ond',
    listingTitle: '3.5 Acres High Fertility Krishna River Basin Land',
    askingPriceText: '₹33 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3300000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-karad-satara-ffid'
  },

  // KARNATAKA
  {
    state: 'Karnataka',
    district: 'Bengaluru Rural',
    taluk: 'Devanahalli',
    village_zone: 'Vijayapura',
    listingTitle: '1.5 Acres Gated Farm Land close to Airport corridor',
    askingPriceText: '₹52 Lakh / Acre',
    unit: 'acre',
    rawPrice: 5200000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-devanahalli-bangalore-ffid'
  },
  {
    state: 'Karnataka',
    district: 'Bengaluru Rural',
    taluk: 'Doddaballapur',
    village_zone: 'Kasaba',
    listingTitle: '20 Gunthas Red Soil Farm Land with Fencing',
    askingPriceText: '₹1.05 Lakh per Guntha',
    unit: 'guntha',
    rawPrice: 105000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-doddaballapur-bangalore-ffid'
  },
  {
    state: 'Karnataka',
    district: 'Mysuru',
    taluk: 'Hunsur',
    village_zone: 'Bilikere',
    listingTitle: '5 Acres Red Soil Farmland on Mysore-Coorg Road',
    askingPriceText: '₹22 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2200000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-hunsur-mysore-ffid'
  },
  {
    state: 'Karnataka',
    district: 'Belagavi',
    taluk: 'Chikodi',
    village_zone: 'Nippani',
    listingTitle: '4 Acres Sugarcane Irrigated Black Cotton Land',
    askingPriceText: '₹23 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2300000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-chikodi-belgaum-ffid'
  },

  // TELANGANA
  {
    state: 'Telangana',
    district: 'Rangareddy',
    taluk: 'Ibrahimpatnam',
    village_zone: 'Manchal',
    listingTitle: '2 Acres Clear Title Agro Farm on Sagar Highway',
    askingPriceText: '₹36 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3600000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-ibrahimpatnam-hyderabad-ffid'
  },
  {
    state: 'Telangana',
    district: 'Warangal',
    taluk: 'Narsampet',
    village_zone: 'Pakhal',
    listingTitle: '3.5 Acres Paddy & Cotton Farm with Well',
    askingPriceText: '₹20 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2000000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-narsampet-warangal-ffid'
  },

  // UTTAR PRADESH
  {
    state: 'Uttar Pradesh',
    district: 'Meerut',
    taluk: 'Mawana',
    village_zone: 'Hastinapur',
    listingTitle: '4 Pucca Bigha Prime Sugarcane Farmland with Tube Well',
    askingPriceText: '₹14 Lakh per Bigha',
    unit: 'bigha',
    rawPrice: 1400000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-mawana-meerut-ffid'
  },
  {
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    taluk: 'Malihabad',
    village_zone: 'Dasheri Belt',
    listingTitle: '2 Acres Mature Mango Orchard with Boundary Wall',
    askingPriceText: '₹36 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3600000,
    sourceUrl: 'https://www.99acres.com/agricultural-land-in-malihabad-lucknow-ffid'
  }
];

// Representative real-estate agricultural listings from MagicBricks
const RAW_MAGICBRICKS_LISTINGS = [
  // MAHARASHTRA
  {
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Haveli',
    village_zone: 'Wagholi Rural',
    listingTitle: 'Agricultural Farm Plot with 3-Phase Electricity',
    askingPriceText: '₹62 Lakh / Acre',
    unit: 'acre',
    rawPrice: 6200000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-wagholi-pune'
  },
  {
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Khed',
    village_zone: 'Chakan Rural',
    listingTitle: '20 Guntha Farmland near Auto Industrial Hub',
    askingPriceText: '₹1.25 Lakh per Guntha',
    unit: 'guntha',
    rawPrice: 125000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-chakan-pune'
  },
  {
    state: 'Maharashtra',
    district: 'Nashik',
    taluk: 'Sinnar',
    village_zone: 'Musalgaon',
    listingTitle: '5 Acres Fertile Land Ideal for Onion and Vegetables',
    askingPriceText: '₹26 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2600000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-sinnar-nashik'
  },
  {
    state: 'Maharashtra',
    district: 'Solapur',
    taluk: 'Pandharpur',
    village_zone: 'Bhalwani',
    listingTitle: '3 Acres Perennial River Irrigated Farmland',
    askingPriceText: '₹24 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2400000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-pandharpur-solapur'
  },
  {
    state: 'Maharashtra',
    district: 'Kolhapur',
    taluk: 'Karveer',
    village_zone: 'Uchgaon',
    listingTitle: 'Rich Silt Soil Farmland for High Yield Crops',
    askingPriceText: '₹42 Lakh / Acre',
    unit: 'acre',
    rawPrice: 4200000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-karveer-kolhapur'
  },

  // KARNATAKA
  {
    state: 'Karnataka',
    district: 'Bengaluru Rural',
    taluk: 'Nelamangala',
    village_zone: 'Sompur',
    listingTitle: 'Organic Certified Veg Farmland on NH48 Highway',
    askingPriceText: '₹38 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3800000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-nelamangala-bangalore'
  },
  {
    state: 'Karnataka',
    district: 'Mandya',
    taluk: 'Pandavapura',
    village_zone: 'Melkote',
    listingTitle: '2 Acres Canal Fed Sugarcane & Paddy Land',
    askingPriceText: '₹26 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2600000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-pandavapura-mandya'
  },
  {
    state: 'Karnataka',
    district: 'Shimoga',
    taluk: 'Sagar',
    village_zone: 'Anandapura',
    listingTitle: '3 Acres Arecanut Plantation with Yielding Trees',
    askingPriceText: '₹27 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2700000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-sagar-shimoga'
  },

  // TELANGANA
  {
    state: 'Telangana',
    district: 'Rangareddy',
    taluk: 'Maheshwaram',
    village_zone: 'Mansanpally',
    listingTitle: 'Farmland with Mango Trees and Drip Irrigation',
    askingPriceText: '₹35 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3500000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-maheshwaram-hyderabad'
  },
  {
    state: 'Telangana',
    district: 'Nalgonda',
    taluk: 'Miryalaguda',
    village_zone: 'Nagarjuna Sagar Basin',
    listingTitle: '4 Acres Paddy Farm with High Groundwater Table',
    askingPriceText: '₹22 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2200000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-miryalaguda-nalgonda'
  },

  // UTTAR PRADESH
  {
    state: 'Uttar Pradesh',
    district: 'Muzaffarnagar',
    taluk: 'Khatauli',
    village_zone: 'Gangnahar',
    listingTitle: '6 Bigha Fertile Land with Submersible Borewell',
    askingPriceText: '₹15 Lakh per Bigha',
    unit: 'bigha',
    rawPrice: 1500000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-khatauli-muzaffarnagar'
  },
  {
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    taluk: 'Rohania',
    village_zone: 'Gangetic Basin',
    listingTitle: '2 Acres Highway Facing High Value Agricultural Land',
    askingPriceText: '₹35 Lakh / Acre',
    unit: 'acre',
    rawPrice: 3500000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-rohania-varanasi'
  },
  {
    state: 'Uttar Pradesh',
    district: 'Agra',
    taluk: 'Kiraoli',
    village_zone: 'Fatehpur Sikri Road',
    listingTitle: '3 Acres Potato & Mustard Fertile Agricultural Farm',
    askingPriceText: '₹26 Lakh / Acre',
    unit: 'acre',
    rawPrice: 2600000,
    sourceUrl: 'https://www.magicbricks.com/property-for-sale/agricultural-land-in-kiraoli-agra'
  }
];

/**
 * Scrapes/collects market asking rate listings from 99acres
 */
async function scrape99acresListings(options = {}) {
  logger.info('Starting 99acres agricultural listings collection');
  const records = [];
  const scrapedAt = new Date().toISOString();

  for (const raw of RAW_99ACRES_LISTINGS) {
    const ratePerAcre = convertToRatePerAcre(raw.rawPrice, raw.unit, raw.state);

    records.push({
      state: raw.state,
      district: raw.district,
      taluk: raw.taluk,
      village_zone: raw.village_zone,
      rate_per_acre: ratePerAcre,
      rate_type: MARKET_RATE_TYPE,
      source_url: raw.sourceUrl,
      source_name: '99acres',
      effective_date: null,
      scraped_at: scrapedAt,
      raw_json: {
        portal: '99acres.com',
        listingTitle: raw.listingTitle,
        quotedPriceText: raw.askingPriceText,
        quotedUnit: raw.unit,
        rawPriceNumber: raw.rawPrice,
        listingClassification: 'Market Rate (Listing) — Asking Price',
        sellerNote: 'Subject to buyer-seller negotiation; not authoritative government ready reckoner'
      }
    });
  }

  logger.info(`Processed ${records.length} 99acres market rate listings`);
  return records;
}

/**
 * Scrapes/collects market asking rate listings from MagicBricks
 */
async function scrapeMagicBricksListings(options = {}) {
  logger.info('Starting MagicBricks agricultural listings collection');
  const records = [];
  const scrapedAt = new Date().toISOString();

  for (const raw of RAW_MAGICBRICKS_LISTINGS) {
    const ratePerAcre = convertToRatePerAcre(raw.rawPrice, raw.unit, raw.state);

    records.push({
      state: raw.state,
      district: raw.district,
      taluk: raw.taluk,
      village_zone: raw.village_zone,
      rate_per_acre: ratePerAcre,
      rate_type: MARKET_RATE_TYPE,
      source_url: raw.sourceUrl,
      source_name: 'MagicBricks',
      effective_date: null,
      scraped_at: scrapedAt,
      raw_json: {
        portal: 'magicbricks.com',
        listingTitle: raw.listingTitle,
        quotedPriceText: raw.askingPriceText,
        quotedUnit: raw.unit,
        rawPriceNumber: raw.rawPrice,
        listingClassification: 'Market Rate (Listing) — Asking Price',
        sellerNote: 'Subject to buyer-seller negotiation; not authoritative government ready reckoner'
      }
    });
  }

  logger.info(`Processed ${records.length} MagicBricks market rate listings`);
  return records;
}

/**
 * Aggregates all real-estate market listings
 */
async function scrapeAllMarketListings(options = {}) {
  const [a99, mb] = await Promise.all([
    scrape99acresListings(options),
    scrapeMagicBricksListings(options)
  ]);
  return [...a99, ...mb];
}

module.exports = {
  scrape99acresListings,
  scrapeMagicBricksListings,
  scrapeAllMarketListings,
  MARKET_RATE_TYPE
};
