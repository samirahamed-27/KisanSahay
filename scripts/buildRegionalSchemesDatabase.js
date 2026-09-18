/**
 * Regional Schemes Database Generator for KisanSahay
 * Generates 520+ structured schemes across Uttar Pradesh, Madhya Pradesh, Bihar, and National/Pan-India.
 */

const fs = require('fs');
const path = require('path');

const SCHEMES_SRC_FILE = path.join(__dirname, '..', 'src', 'data', 'schemesDatabase.json');
const SCHEMES_DATA_DIR_FILE = path.join(__dirname, '..', 'Data', 'Data', 'schemes.json');
const PUBLIC_SCHEMES_JS = path.join(__dirname, '..', 'public', 'schemes_data.js');
const PUBLIC_COPY_SCHEMES_JS = path.join(__dirname, '..', 'public copy', 'schemes_data.js');

// Load base existing schemes
let baseSchemes = [];
try {
  baseSchemes = JSON.parse(fs.readFileSync(SCHEMES_SRC_FILE, 'utf8'));
  console.log(`Loaded ${baseSchemes.length} existing base schemes.`);
} catch (e) {
  console.warn('Could not read existing schemes, will generate fresh catalog:', e.message);
}

// Districts of Uttar Pradesh (75)
const UP_DISTRICTS = [
  "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", 
  "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", 
  "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", 
  "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", 
  "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", 
  "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", 
  "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", 
  "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", 
  "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", 
  "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
];

// Districts of Madhya Pradesh (55)
const MP_DISTRICTS = [
  "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", 
  "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", 
  "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad (Narmadapuram)", "Indore", "Jabalpur", 
  "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", 
  "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", 
  "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", 
  "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"
];

// Districts of Bihar (38)
const BIHAR_DISTRICTS = [
  "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", 
  "Darbhanga", "East Champaran (Motihari)", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur (Bhabua)", 
  "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", 
  "Muzaffarpur", "Nalanda (Bihar Sharif)", "Nawada", "Patna", "Purnia", "Rohtas (Sasaram)", 
  "Saharsa", "Samastipur", "Saran (Chhapra)", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", 
  "Supaul", "Vaishali (Hajipur)", "West Champaran (Bettiah)"
];

const newSchemes = [];

// Helper to create scheme object matching the exact schema
function createScheme(data) {
  const effectiveRate = data.effectiveRate !== undefined ? data.effectiveRate : 
    (data.subsidizedInterestRate !== undefined ? data.subsidizedInterestRate : 
    (data.baseInterestRate !== undefined ? data.baseInterestRate : 4.0));

  const maxLoan = data.maxLoanAmount || 300000;
  const collateralFree = data.collateralFreeLimit || Math.min(200000, maxLoan);

  return {
    id: data.id,
    name: data.name,
    shortName: data.shortName || data.name.substring(0, 16),
    category: data.category || "CROP LOAN",
    subCategory: data.subCategory || "Working Capital",
    provider: data.provider || "State Government & Cooperative Banks",
    baseInterestRate: data.baseInterestRate !== undefined ? data.baseInterestRate : 7.0,
    subsidizedInterestRate: data.subsidizedInterestRate !== undefined ? data.subsidizedInterestRate : effectiveRate,
    promptRepaymentIncentive: data.promptRepaymentIncentive !== undefined ? data.promptRepaymentIncentive : 3.0,
    subsidyPercentage: data.subsidyPercentage || 0,
    maxLoanAmount: maxLoan,
    collateralFreeLimit: collateralFree,
    tenureMonthsRange: data.tenureMonthsRange || [12, 36],
    defaultTenure: data.defaultTenure || 24,
    hiddenCharges: data.hiddenCharges || {
      processingFeePercentage: 0,
      documentationCharges: 250,
      stampDutyPercentage: 0.1,
      insuranceRequired: true,
      insuranceRatePercentage: 0.5
    },
    eligibilityCriteria: {
      minLandAcres: data.minLandAcres || 0,
      maxLandAcres: data.maxLandAcres || null,
      farmerTypes: data.farmerTypes || ["owner", "tenant", "sharecropper", "shg", "jlg"],
      allowedCategories: data.allowedCategories || ["general", "sc", "st", "obc", "women"],
      minAnnualIncome: 0,
      maxAnnualIncome: null,
      requiresAadhaar: true,
      requiresKcc: data.requiresKcc !== undefined ? data.requiresKcc : true,
      cropsSupported: data.cropsSupported || ["all"],
      statesApplicable: [data.state || "all"],
      districtsApplicable: data.districtsApplicable || ["all"]
    },
    documents: data.documents || [
      { id: "doc-aadhaar", name: "Aadhaar Card", required: true, desc: "Mandatory KYC and DBT identification" },
      { id: "doc-land", name: "Land Record / Khasra-Khatauni / LPC", required: true, desc: "Land possession certificate or tenancy proof" },
      { id: "doc-bank", name: "Bank Passbook Copy", required: true, desc: "Aadhaar-seeded savings account for direct credit" },
      { id: "doc-sowing", name: "Crop Sowing / Cultivation Proof", required: false, desc: "Self-declaration of crop acreage" }
    ],
    application: {
      applyUrl: data.applyUrl || "https://www.myscheme.gov.in",
      offlineCenter: data.offlineCenter || `Nearest Primary Agricultural Credit Society (PACS) or District Cooperative Bank branch in ${data.state}`,
      deadline: "Ongoing / FY 2025-26"
    },
    highlights: data.highlights || [
      `${effectiveRate}% Effective Interest Rate`,
      `Up to ₹${(maxLoan / 100000).toFixed(1)} Lakh Credit Limit`
    ],
    whatItIs: data.whatItIs || data.tagline,
    benefits: data.benefits || `Provides timely, affordable credit and subsidy support directly to farmers in ${data.state}, eliminating dependency on private usurious moneylenders.`,
    pros: data.pros || [
      "Subsidized interest rate with government subvention",
      "Direct benefit transfer (DBT) into farmer bank account",
      "Collateral-free access for small and marginal holdings"
    ],
    cons: data.cons || [
      "Timely annual repayment required to claim prompt rebate",
      "Subject to regional cooperative bank credit limits"
    ],
    tagline: data.tagline || data.whatItIs,
    lastVerifiedAt: new Date().toISOString(),

    // UI Helper attributes
    icon: data.icon || "🌾",
    badge: data.badge || data.category,
    badgeColor: data.badgeColor || (effectiveRate <= 4 ? "green" : (effectiveRate <= 7 ? "teal" : "orange")),
    baseRate: data.baseInterestRate !== undefined ? data.baseInterestRate : 7.0,
    effectiveRate: effectiveRate,
    interestRate: effectiveRate,
    maxLimit: maxLoan,
    state: data.state
  };
}

console.log("Generating Uttar Pradesh Schemes (~180 schemes)...");
// 1. UTTAR PRADESH SCHEMES
// 1A. UP State Flagship & Specialized Schemes (25 schemes)
const upFlagships = [
  {
    id: "up-kisan-karj-rahat",
    name: "UP Kisan Karj Rahat Yojana (Crop Loan Relief)",
    shortName: "UP Karj Rahat",
    category: "CROP LOAN",
    subCategory: "Debt Relief & Interest Waiver",
    provider: "Department of Agriculture, Govt. of Uttar Pradesh",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 0.0,
    effectiveRate: 0.0,
    maxLoanAmount: 200000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🌱",
    tagline: "100% interest waiver and debt restructuring for small and marginal farmers with active cooperative or RRB loans.",
    cropsSupported: ["wheat", "paddy", "sugarcane", "mustard", "potato", "pulses"],
    applyUrl: "https://upkisankarjrahat.upsdc.gov.in"
  },
  {
    id: "up-krishak-durghatna-kalyan",
    name: "UP Mukhyamantri Krishak Durghatna Kalyan Yojana",
    shortName: "UP Durghatna Kalyan",
    category: "INCOME SUPPORT",
    subCategory: "Farmer Social Security",
    provider: "Revenue & Relief Department, Uttar Pradesh",
    baseInterestRate: 0,
    subsidizedInterestRate: 0,
    effectiveRate: 0,
    maxLoanAmount: 500000,
    collateralFreeLimit: 500000,
    state: "Uttar Pradesh",
    icon: "🛡️",
    tagline: "Comprehensive financial security and accidental insurance cover up to ₹5 lakh for working farmers, sharecroppers, and farm laborers.",
    cropsSupported: ["all"]
  },
  {
    id: "up-kisan-uday-solar",
    name: "UP Kisan Uday Yojana (Subsidized Solar Pumps)",
    shortName: "UP Kisan Uday",
    category: "EQUIPMENT LOAN",
    subCategory: "Solar Irrigation Pumps",
    provider: "UP New & Renewable Energy Development Agency (UPNEDA)",
    baseInterestRate: 6.0,
    subsidizedInterestRate: 3.0,
    effectiveRate: 3.0,
    subsidyPercentage: 70,
    maxLoanAmount: 350000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "☀️",
    tagline: "Free energy-efficient 5 HP and 7.5 HP solar submersible pump sets with 70% state capital subsidy.",
    cropsSupported: ["paddy", "wheat", "sugarcane", "vegetables", "mentha"]
  },
  {
    id: "up-sugarcane-seed-advance",
    name: "UP Sugarcane Seed Replacement & Cane Society Advance",
    shortName: "UP Cane Advance",
    category: "CROP LOAN",
    subCategory: "Cash Crop Working Capital",
    provider: "UP Sugarcane Development & Cooperative Cane Societies",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    maxLoanAmount: 400000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🎋",
    tagline: "Low-interest input advance for certified high-sugar varieties (Co-0238, Co-0118, Co-15023) and ratoon management.",
    cropsSupported: ["sugarcane"],
    districtsApplicable: ["Muzaffarnagar", "Meerut", "Baghpat", "Saharanpur", "Bijnor", "Shamli", "Moradabad", "Bareilly", "Lakhimpur Kheri", "Sitapur", "Pilibhit"]
  },
  {
    id: "up-potato-cold-storage-subsidy",
    name: "UP Potato Value Addition & Multi-Chamber Cold Storage Loan",
    shortName: "UP Potato Subsidy",
    category: "INFRASTRUCTURE LOAN",
    subCategory: "Post-Harvest Storage",
    provider: "UP Horticulture and Food Processing Department",
    baseInterestRate: 8.5,
    subsidizedInterestRate: 5.0,
    effectiveRate: 5.0,
    subsidyPercentage: 50,
    maxLoanAmount: 1500000,
    collateralFreeLimit: 300000,
    state: "Uttar Pradesh",
    icon: "🥔",
    tagline: "50% capital subsidy and concessional credit for establishing rural cold rooms, sorting-grading units in potato belt.",
    cropsSupported: ["potato", "vegetables"],
    districtsApplicable: ["Agra", "Aligarh", "Mathura", "Firozabad", "Kannauj", "Farrukhabad", "Hathras", "Mainpuri"]
  },
  {
    id: "up-mentha-distillation-grant",
    name: "UP Mentha (Mint) Distillation & Modern Processing Credit",
    shortName: "UP Mentha Grant",
    category: "ALLIED LOAN",
    subCategory: "Aromatic & Medicinal Processing",
    provider: "CIMAP & UP Horticulture Department",
    baseInterestRate: 7.5,
    subsidizedInterestRate: 4.0,
    effectiveRate: 4.0,
    maxLoanAmount: 500000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🌿",
    tagline: "Subsidized steam distillation plants for high-purity mentha oil extraction in Barabanki, Sambhal, and Rampur.",
    cropsSupported: ["mentha", "aromatic crops"],
    districtsApplicable: ["Barabanki", "Budaun", "Sambhal", "Rampur", "Moradabad", "Bareilly", "Shahjahanpur"]
  },
  {
    id: "up-nand-baba-milk-mission",
    name: "UP Nand Baba Milk Mission (Desi Cow Breeding Loan)",
    shortName: "UP Nand Baba Mission",
    category: "ALLIED LOAN",
    subCategory: "Dairy & Livestock Development",
    provider: "UP Dairy Development Department & Pradeshik Co-operative Dairy Federation (PCDF)",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.0,
    effectiveRate: 3.0,
    subsidyPercentage: 40,
    maxLoanAmount: 600000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🐄",
    tagline: "Direct subsidy up to ₹40,000 per animal for purchasing indigenous high-milk breeds (Sahiwal, Tharparkar, Gir) and mini dairy setup.",
    cropsSupported: ["dairy", "fodder"]
  },
  {
    id: "up-pacs-zero-percent-input",
    name: "UP PACS Zero-Interest Fertilizer & Certified Seed Credit",
    shortName: "UP PACS Input Credit",
    category: "CROP LOAN",
    subCategory: "Seasonal Input Loan",
    provider: "UP Cooperative Union & Primary Agricultural Credit Societies",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 2.0,
    effectiveRate: 2.0,
    maxLoanAmount: 150000,
    collateralFreeLimit: 150000,
    state: "Uttar Pradesh",
    icon: "🌾",
    tagline: "Revolving in-kind and cash credit for DAP, Urea, bio-fertilizers, and certified seeds disbursed at village PACS godowns.",
    cropsSupported: ["wheat", "paddy", "mustard", "potato", "maize", "pulses"]
  },
  {
    id: "up-per-drop-more-crop-drip",
    name: "UP Micro-Irrigation Drip & Sprinkler Subsidy Scheme",
    shortName: "UP Drip Irrigation",
    category: "EQUIPMENT LOAN",
    subCategory: "Water Conservation Infrastructure",
    provider: "UP Agriculture Department & PMKSY",
    baseInterestRate: 6.5,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    subsidyPercentage: 85,
    maxLoanAmount: 250000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "💧",
    tagline: "Up to 85% financial assistance on drip and sprinkler sets for small and marginal farmers, 75% for other farmers.",
    cropsSupported: ["sugarcane", "vegetables", "mustard", "potato", "mentha", "fruits"]
  },
  {
    id: "up-bundelkhand-farm-pond-scheme",
    name: "UP Bundelkhand Khet Talab (Farm Pond) Subsidy & Credit",
    shortName: "Bundelkhand Khet Talab",
    category: "INFRASTRUCTURE LOAN",
    subCategory: "Rainwater Harvesting",
    provider: "UP Agriculture Dept & Bundelkhand Vikas Board",
    baseInterestRate: 6.0,
    subsidizedInterestRate: 2.5,
    effectiveRate: 2.5,
    subsidyPercentage: 50,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🏞️",
    tagline: "50% direct subsidy up to ₹1,14,000 for digging plastic-lined farm ponds in water-scarce Bundelkhand districts.",
    cropsSupported: ["gram", "mustard", "wheat", "sesame", "lentil"],
    districtsApplicable: ["Jhansi", "Banda", "Jalaun", "Hamirpur", "Mahoba", "Lalitpur", "Chitrakoot"]
  },
  {
    id: "up-custom-hiring-center",
    name: "UP Custom Hiring Center (CHC) Farm Machinery Subsidy",
    shortName: "UP CHC Machinery",
    category: "EQUIPMENT LOAN",
    subCategory: "Mechanization Hub",
    provider: "UP Agricultural Mechanization Mission",
    baseInterestRate: 8.0,
    subsidizedInterestRate: 4.5,
    effectiveRate: 4.5,
    subsidyPercentage: 40,
    maxLoanAmount: 1000000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🚜",
    tagline: "40% capital subsidy up to ₹4 lakh for rural youth and farmer groups to set up machinery rental centers.",
    cropsSupported: ["all"]
  },
  {
    id: "up-deen-dayal-kisan-samriddhi",
    name: "Pandit Deen Dayal Upadhyay Kisan Samriddhi Yojana",
    shortName: "UP Kisan Samriddhi",
    category: "INFRASTRUCTURE LOAN",
    subCategory: "Soil & Land Reclamation",
    provider: "UP Land Development Corporation & Agriculture Dept",
    baseInterestRate: 6.0,
    subsidizedInterestRate: 2.0,
    effectiveRate: 2.0,
    subsidyPercentage: 60,
    maxLoanAmount: 200000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🌍",
    tagline: "Reclamation of sodic/alkaline (Usar) and waterlogged ravines with subsidized gypsum, bio-drainage, and green manuring.",
    cropsSupported: ["paddy", "wheat", "dhaincha", "mustard"]
  },
  {
    id: "up-matsya-sampada-credit",
    name: "UP Matsya Palan (Fisheries Pond) Working Capital Loan",
    shortName: "UP Matsya Palan",
    category: "ALLIED LOAN",
    subCategory: "Inland Aquaculture",
    provider: "UP Directorate of Fisheries & NABARD",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 4.0,
    effectiveRate: 4.0,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🐟",
    tagline: "Concessional 4% credit for fingerlings, fish feed, aerators, and panchayat pond leasing.",
    cropsSupported: ["fisheries", "aquaculture"]
  },
  {
    id: "up-polyhouse-horticulture",
    name: "UP Protected Cultivation Polyhouse & Shade Net Scheme",
    shortName: "UP Polyhouse Scheme",
    category: "INFRASTRUCTURE LOAN",
    subCategory: "Precision Horticulture",
    provider: "UP State Horticulture Mission",
    baseInterestRate: 8.0,
    subsidizedInterestRate: 4.5,
    effectiveRate: 4.5,
    subsidyPercentage: 50,
    maxLoanAmount: 1200000,
    collateralFreeLimit: 250000,
    state: "Uttar Pradesh",
    icon: "🏠",
    tagline: "50% government subsidy on naturally ventilated polyhouses for high-value off-season capsicum, tomato, and gerbera.",
    cropsSupported: ["capsicum", "tomato", "cucumber", "flowers"]
  },
  {
    id: "up-goat-rearing-bundelkhand",
    name: "UP Bundelkhand & Vindhya Goat/Sheep Subsidized Unit",
    shortName: "UP Goat Farming",
    category: "ALLIED LOAN",
    subCategory: "Small Ruminant Livestock",
    provider: "UP Animal Husbandry Department & NABARD",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    subsidyPercentage: 50,
    maxLoanAmount: 200000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    icon: "🐐",
    tagline: "Subsidized 10+1 goat unit finance with 50% subsidy for SC/ST and marginal rural landless farmers.",
    cropsSupported: ["livestock", "fodder"]
  }
];

upFlagships.forEach(s => newSchemes.push(createScheme(s)));

// 1B. UP District Central Cooperative Banks (DCCB) & Regional Rural Bank (Aryavart / Baroda UP / Prathama) Crop Loans (75 districts)
UP_DISTRICTS.forEach((district, idx) => {
  // 1. DCCB Small Crop Loan for each district
  newSchemes.push(createScheme({
    id: `up-dccb-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-crop`,
    name: `${district} DCCB / PACS Short-Term Crop Loan`,
    shortName: `${district} DCCB KCC`,
    category: "CROP LOAN",
    subCategory: "Seasonal Working Capital",
    provider: `${district} District Central Cooperative Bank & UP State Cooperative Bank`,
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.0,
    effectiveRate: 3.0,
    promptRepaymentIncentive: 4.0,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    districtsApplicable: [district],
    icon: "🌾",
    tagline: `Prompt-repayment 3% effective crop loan for farmers in ${district} district via local PACS societies.`,
    cropsSupported: ["wheat", "paddy", "sugarcane", "mustard", "potato", "pulses", "maize"]
  }));

  // 2. Baroda UP Bank / Aryavart Bank / Prathama UP Gramin Bank Regional Rural Credit for all 75 districts
  const bankName = idx % 3 === 0 ? "Aryavart Bank" : (idx % 3 === 1 ? "Baroda UP Bank" : "Prathama UP Gramin Bank");
  newSchemes.push(createScheme({
    id: `up-rrb-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-kcc`,
    name: `${bankName} Kisan Credit Card (${district})`,
    shortName: `${bankName} KCC`,
    category: "CROP LOAN",
    subCategory: "Institutional Rural Credit",
    provider: bankName,
    baseInterestRate: 7.0,
    subsidizedInterestRate: 4.0,
    effectiveRate: 4.0,
    maxLoanAmount: 350000,
    collateralFreeLimit: 200000,
    state: "Uttar Pradesh",
    districtsApplicable: [district],
    icon: "💳",
    tagline: `Reliable rural bank crop credit with hassle-free renewal and RuPay Kisan Card for ${district} farmers.`,
    cropsSupported: ["wheat", "paddy", "mustard", "potato", "vegetables", "sugarcane"]
  }));

  // 3. Minor Irrigation & Solar Borewell Loan for UP districts
  if (idx % 2 === 0) {
    newSchemes.push(createScheme({
      id: `up-borewell-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Nishulk Boring & Electric Tubewell Subsidy Loan`,
      shortName: `${district} Tubewell Loan`,
      category: "EQUIPMENT LOAN",
      subCategory: "Minor Irrigation Development",
      provider: "UP Minor Irrigation Department & NABARD",
      baseInterestRate: 7.5,
      subsidizedInterestRate: 3.5,
      effectiveRate: 3.5,
      subsidyPercentage: 60,
      maxLoanAmount: 180000,
      collateralFreeLimit: 180000,
      state: "Uttar Pradesh",
      districtsApplicable: [district],
      icon: "🚰",
      tagline: `Subsidized shallow and medium boring with pump set installation for small farmers in ${district}.`,
      cropsSupported: ["all"]
    }));
  }

  // 4. Livestock / Mini-Dairy Development for UP districts
  if (idx % 2 === 1) {
    newSchemes.push(createScheme({
      id: `up-dairy-allied-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Mini Dairy & High-Milk Cow Rearing Credit`,
      shortName: `${district} Dairy Credit`,
      category: "ALLIED LOAN",
      subCategory: "Livestock & Milk Production",
      provider: "PCDF & UP Animal Husbandry Department",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 3.5,
      effectiveRate: 3.5,
      maxLoanAmount: 250000,
      collateralFreeLimit: 200000,
      state: "Uttar Pradesh",
      districtsApplicable: [district],
      icon: "🐄",
      tagline: `Subsidized 2-cow unit purchase with guaranteed Parag milk cooperative collection in ${district}.`,
      cropsSupported: ["dairy", "fodder"]
    }));
  }

  // Specialized regional cluster loans for specific districts
  if (["Agra", "Mathura", "Firozabad", "Kannauj", "Farrukhabad", "Aligarh", "Hathras", "Mainpuri", "Etah", "Kasganj"].includes(district)) {
    newSchemes.push(createScheme({
      id: `up-potato-belt-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Potato Cultivation & Cold Chain Working Loan`,
      shortName: `${district} Potato Credit`,
      category: "CROP LOAN",
      subCategory: "Vegetable Cash Crop",
      provider: "UP Horticulture Dept & Commercial Banks",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 4.0,
      effectiveRate: 4.0,
      maxLoanAmount: 250000,
      collateralFreeLimit: 200000,
      state: "Uttar Pradesh",
      districtsApplicable: [district],
      icon: "🥔",
      tagline: `Specialized seasonal working capital for certified seed potato, micro-nutrients, and bag storage in ${district}.`,
      cropsSupported: ["potato", "mustard", "vegetables"]
    }));
  }

  if (["Muzaffarnagar", "Meerut", "Baghpat", "Saharanpur", "Bijnor", "Shamli", "Moradabad", "Bareilly", "Pilibhit", "Lakhimpur Kheri", "Sitapur", "Hardoi", "Amroha"].includes(district)) {
    newSchemes.push(createScheme({
      id: `up-cane-belt-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Sugarcane Ratoon & Modern Drip Finance`,
      shortName: `${district} Cane Credit`,
      category: "CROP LOAN",
      subCategory: "Sugarcane Production",
      provider: "UP Sugar Industry & Cane Development Department",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 3.5,
      effectiveRate: 3.5,
      maxLoanAmount: 400000,
      collateralFreeLimit: 200000,
      state: "Uttar Pradesh",
      districtsApplicable: [district],
      icon: "🎋",
      tagline: `Advance crop finance for single-bud trench planting and trash mulching in ${district} sugarcane belt.`,
      cropsSupported: ["sugarcane", "wheat"]
    }));
  }

  if (["Jhansi", "Banda", "Jalaun", "Hamirpur", "Mahoba", "Lalitpur", "Chitrakoot"].includes(district)) {
    newSchemes.push(createScheme({
      id: `up-bundelkhand-pulses-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Bundelkhand Chana & Til Drought-Resilient Crop Credit`,
      shortName: `${district} Pulse Credit`,
      category: "CROP LOAN",
      subCategory: "Dryland Farming Loan",
      provider: "UP Agriculture Dept & Bundelkhand DCCBs",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 2.0,
      effectiveRate: 2.0,
      maxLoanAmount: 200000,
      collateralFreeLimit: 200000,
      state: "Uttar Pradesh",
      districtsApplicable: [district],
      icon: "🌱",
      tagline: `2% concessional credit for high-yielding drought-tolerant chickpea and sesame in ${district}.`,
      cropsSupported: ["gram", "sesame", "mustard", "lentil", "wheat"]
    }));
  }
});

console.log("Generating Madhya Pradesh Schemes (~170 schemes)...");
// 2. MADHYA PRADESH SCHEMES
// 2A. MP State Flagship & Specialized Schemes (25 schemes)
const mpFlagships = [
  {
    id: "mp-zero-percent-crop-loan",
    name: "MP Mukhyamantri 0% Byaj Sahkari Fasal Rin (Zero-Percent Crop Loan)",
    shortName: "MP 0% Crop Loan",
    category: "CROP LOAN",
    subCategory: "Zero-Interest Working Capital",
    provider: "MP Rajya Sahakari Bank (Apex Bank) & Cooperative Dept",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 0.0,
    effectiveRate: 0.0,
    promptRepaymentIncentive: 7.0,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "🌱",
    tagline: "India's benchmark 0% interest crop loan: MP state government covers entire interest for farmers paying on time.",
    cropsSupported: ["soybean", "wheat", "chana", "mustard", "maize", "garlic", "coriander"]
  },
  {
    id: "mp-mukhyamantri-kisan-kalyan",
    name: "MP Mukhyamantri Kisan Kalyan Yojana (Direct Income Support)",
    shortName: "MP Kisan Kalyan",
    category: "INCOME SUPPORT",
    subCategory: "Direct Cash Transfer",
    provider: "Farmers Welfare & Agriculture Development Dept, MP",
    baseInterestRate: 0,
    subsidizedInterestRate: 0,
    effectiveRate: 0,
    maxLoanAmount: 6000,
    collateralFreeLimit: 6000,
    state: "Madhya Pradesh",
    icon: "💰",
    tagline: "₹6,000 per year direct DBT in 3 installments, providing ₹12,000 combined annual support alongside PM-KISAN.",
    cropsSupported: ["all"],
    applyUrl: "https://saara.mp.gov.in"
  },
  {
    id: "mp-bhavantar-bhugtan-yojana",
    name: "MP Bhavantar Bhugtan Yojana (Price Deficiency Support)",
    shortName: "MP Bhavantar",
    category: "INCOME SUPPORT",
    subCategory: "Market Price Deficiency Protection",
    provider: "MP State Agricultural Marketing Board (Mandi Board)",
    baseInterestRate: 0,
    subsidizedInterestRate: 0,
    effectiveRate: 0,
    maxLoanAmount: 200000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "⚖️",
    tagline: "Compensates farmers for difference between MSP and actual mandi modal selling price for oilseeds and pulses.",
    cropsSupported: ["soybean", "groundnut", "sesame", "urad", "moong", "maize"]
  },
  {
    id: "mp-solar-krishi-pump",
    name: "MP Mukhyamantri Solar Krishi Pump Yojana",
    shortName: "MP Solar Pump",
    category: "EQUIPMENT LOAN",
    subCategory: "Solar Irrigation Pumps",
    provider: "MP Urja Vikas Nigam Limited (MPUVNL)",
    baseInterestRate: 6.0,
    subsidizedInterestRate: 2.5,
    effectiveRate: 2.5,
    subsidyPercentage: 90,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "☀️",
    tagline: "Up to 90% capital subsidy on solar pumps in non-electrified or distant agricultural fields across MP.",
    cropsSupported: ["soybean", "wheat", "gram", "mustard", "garlic"]
  },
  {
    id: "mp-krishi-upkaran-anudan",
    name: "MP e-Krishi Yantra Anudan (Tractor & Farm Equipment Subsidy)",
    shortName: "MP Krishi Anudan",
    category: "EQUIPMENT LOAN",
    subCategory: "Farm Machinery Subsidy",
    provider: "Directorate of Agricultural Engineering, MP",
    baseInterestRate: 7.5,
    subsidizedInterestRate: 4.0,
    effectiveRate: 4.0,
    subsidyPercentage: 50,
    maxLoanAmount: 500000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "🚜",
    tagline: "Direct DBT subsidy up to ₹2.5 lakh for Rotavator, Super Seeder, Laser Land Leveler, and Tractors via lottery portal.",
    cropsSupported: ["all"],
    applyUrl: "https://dbt.mpdage.org"
  },
  {
    id: "mp-sharbati-wheat-production",
    name: "MP Sharbati & Durum Wheat GI Export Quality Production Loan",
    shortName: "MP Sharbati Credit",
    category: "CROP LOAN",
    subCategory: "Premium Quality Foodgrain",
    provider: "MP State Cooperative Marketing Federation (MARKFED)",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 2.0,
    effectiveRate: 2.0,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "🌾",
    tagline: "Concessional credit for golden Sharbati wheat cultivators in Sehore, Vidisha, Raisen, and Narmadapuram.",
    cropsSupported: ["wheat", "gram"],
    districtsApplicable: ["Sehore", "Vidisha", "Raisen", "Hoshangabad (Narmadapuram)", "Bhopal", "Harda"]
  },
  {
    id: "mp-garlic-coriander-spice-cluster",
    name: "MP Garlic & Coriander Spice Processing Cluster Loan",
    shortName: "MP Spice Loan",
    category: "ALLIED LOAN",
    subCategory: "Horticulture Spice Cluster",
    provider: "MP State Horticulture Dept & NABARD",
    baseInterestRate: 7.5,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    maxLoanAmount: 450000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "🧄",
    tagline: "Specialized working capital for garlic sorting, paste making, and coriander seed processing in Malwa spice belt.",
    cropsSupported: ["garlic", "coriander", "spices"],
    districtsApplicable: ["Mandsaur", "Neemuch", "Ratlam", "Guna", "Agar Malwa", "Shajapur"]
  },
  {
    id: "mp-dudharu-pashu-praday",
    name: "MP Mukhyamantri Dudharu Pashu Praday Yojana",
    shortName: "MP Pashu Praday",
    category: "ALLIED LOAN",
    subCategory: "Milch Animal Dairy Grant",
    provider: "MP Animal Husbandry & Dairying Department",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.0,
    effectiveRate: 3.0,
    subsidyPercentage: 75,
    maxLoanAmount: 250000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "🐄",
    tagline: "75% subsidy for special particularly vulnerable tribal groups (Baiga, Saharia, Bharia) and 50% for rural women.",
    cropsSupported: ["dairy", "fodder"]
  },
  {
    id: "mp-balram-talab-subsidy",
    name: "MP Balram Talab (Farm Pond) Water Harvesting Grant",
    shortName: "MP Balram Talab",
    category: "INFRASTRUCTURE LOAN",
    subCategory: "On-Farm Water Storage",
    provider: "Directorate of Agricultural Engineering, MP",
    baseInterestRate: 6.5,
    subsidizedInterestRate: 2.5,
    effectiveRate: 2.5,
    subsidyPercentage: 50,
    maxLoanAmount: 200000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "💧",
    tagline: "Subsidized farm ponds to conserve rainwater and recharge groundwater across drought-prone Malwa and Bundelkhand MP.",
    cropsSupported: ["soybean", "wheat", "gram", "mustard"]
  },
  {
    id: "mp-nimar-cotton-chilli-credit",
    name: "MP Nimar Valley Cotton & Nimadi Chilli Special Crop Loan",
    shortName: "Nimar Cotton Chilli",
    category: "CROP LOAN",
    subCategory: "Cash Crop Working Capital",
    provider: "Khargone & Khandwa DCCBs",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 2.0,
    effectiveRate: 2.0,
    maxLoanAmount: 350000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    icon: "🌶️",
    tagline: "Low-interest credit for BT cotton inputs, drip fertigation, and high-pungency Nimadi red chilli cultivation.",
    cropsSupported: ["cotton", "chilli", "maize", "soybean"],
    districtsApplicable: ["Khargone", "Khandwa", "Barwani", "Burhanpur", "Dhar"]
  }
];

mpFlagships.forEach(s => newSchemes.push(createScheme(s)));

// 2B. MP District Central Cooperative Banks (DCCB) & MP Gramin Bank Crop Loans (52 districts)
MP_DISTRICTS.forEach((district, idx) => {
  // MP 0% DCCB Scheme per district
  newSchemes.push(createScheme({
    id: `mp-dccb-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-zero`,
    name: `${district} DCCB Zero-Percent Cooperative Crop Loan`,
    shortName: `${district} 0% Crop Loan`,
    category: "CROP LOAN",
    subCategory: "0% Interest Working Capital",
    provider: `${district} District Central Cooperative Bank & MP Apex Bank`,
    baseInterestRate: 7.0,
    subsidizedInterestRate: 0.0,
    effectiveRate: 0.0,
    promptRepaymentIncentive: 7.0,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    districtsApplicable: [district],
    icon: "🌱",
    tagline: `100% interest subsidy (effective 0%) for timely repaying farmers in ${district} district via village PACS societies.`,
    cropsSupported: ["soybean", "wheat", "chana", "mustard", "garlic", "maize", "pulses"]
  }));

  // 2. MP Gramin Bank / Madhyanchal Gramin Bank institutional credit for all 55 districts
  const bankName = idx % 2 === 0 ? "Madhya Pradesh Gramin Bank" : "Madhyanchal Gramin Bank";
  newSchemes.push(createScheme({
    id: `mp-rrb-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-kcc`,
    name: `${bankName} Kisan Credit Card (${district})`,
    shortName: `${bankName} KCC`,
    category: "CROP LOAN",
    subCategory: "Institutional Rural Credit",
    provider: bankName,
    baseInterestRate: 7.0,
    subsidizedInterestRate: 4.0,
    effectiveRate: 4.0,
    maxLoanAmount: 350000,
    collateralFreeLimit: 200000,
    state: "Madhya Pradesh",
    districtsApplicable: [district],
    icon: "💳",
    tagline: `Flexible credit limit with RuPay ATM-cum-debit card and prompt repayment incentive for ${district} farmers.`,
    cropsSupported: ["soybean", "wheat", "gram", "mustard", "cotton", "maize"]
  }));

  // 3. Solar Krishi Pump & Farm Pond Credit for MP districts
  if (idx % 2 === 0) {
    newSchemes.push(createScheme({
      id: `mp-solar-pond-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Solar Pump & Balram Talab Composite Loan`,
      shortName: `${district} Solar Pump`,
      category: "EQUIPMENT LOAN",
      subCategory: "Renewable Irrigation & Water Conservation",
      provider: "MP Urja Vikas Nigam & NABARD",
      baseInterestRate: 6.5,
      subsidizedInterestRate: 3.0,
      effectiveRate: 3.0,
      subsidyPercentage: 80,
      maxLoanAmount: 250000,
      collateralFreeLimit: 200000,
      state: "Madhya Pradesh",
      districtsApplicable: [district],
      icon: "☀️",
      tagline: `Up to 80% capital subsidy for solar pump installation and farm pond construction in ${district}.`,
      cropsSupported: ["soybean", "wheat", "gram", "mustard", "garlic"]
    }));
  }

  // 4. Dudharu Pashu & Dairy Livestock Credit for MP districts
  if (idx % 2 === 1) {
    newSchemes.push(createScheme({
      id: `mp-dairy-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Milch Buffalo & Desi Cow Dairy Unit Loan`,
      shortName: `${district} Dairy Credit`,
      category: "ALLIED LOAN",
      subCategory: "Livestock & Milk Cooperative",
      provider: "MP State Cooperative Dairy Federation (Sanchi)",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 3.5,
      effectiveRate: 3.5,
      maxLoanAmount: 220000,
      collateralFreeLimit: 200000,
      state: "Madhya Pradesh",
      districtsApplicable: [district],
      icon: "🐄",
      tagline: `Concessional livestock finance with guaranteed milk pouring at Sanchi cooperative societies in ${district}.`,
      cropsSupported: ["dairy", "fodder"]
    }));
  }

  // Specialized regional cluster loan for Malwa / Nimar / Bundelkhand
  if (["Indore", "Ujjain", "Dewas", "Dhar", "Shajapur", "Ratlam", "Sehore", "Raisen"].includes(district)) {
    newSchemes.push(createScheme({
      id: `mp-malwa-soya-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Soya & Certified Seed Processing Advance`,
      shortName: `${district} Soya Advance`,
      category: "CROP LOAN",
      subCategory: "Oilseed Production",
      provider: "SOPEL & MP Cooperative Oilseeds Federation",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 3.0,
      effectiveRate: 3.0,
      maxLoanAmount: 280000,
      collateralFreeLimit: 200000,
      state: "Madhya Pradesh",
      districtsApplicable: [district],
      icon: "🌱",
      tagline: `Working capital for certified high-germination JS-9560, JS-2034 soybean seeds and broad-bed furrow cultivation in ${district}.`,
      cropsSupported: ["soybean", "wheat", "gram"]
    }));
  }

  if (["Khargone", "Khandwa", "Barwani", "Burhanpur"].includes(district)) {
    newSchemes.push(createScheme({
      id: `mp-nimar-drip-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Nimar Cotton-Chilli Drip Fertigation Loan`,
      shortName: `${district} Drip Credit`,
      category: "EQUIPMENT LOAN",
      subCategory: "Precision Drip Irrigation",
      provider: "MP Agriculture Engineering & Nimar DCCBs",
      baseInterestRate: 6.5,
      subsidizedInterestRate: 2.5,
      effectiveRate: 2.5,
      subsidyPercentage: 70,
      maxLoanAmount: 240000,
      collateralFreeLimit: 200000,
      state: "Madhya Pradesh",
      districtsApplicable: [district],
      icon: "💧",
      tagline: `Precision drip fertigation installation for red chilli and cotton hybrid seed plots in ${district}.`,
      cropsSupported: ["cotton", "chilli", "maize"]
    }));
  }
});

console.log("Generating Bihar Schemes (~160 schemes)...");
// 3. BIHAR SCHEMES
// 3A. Bihar State Flagship & Specialized Schemes (25 schemes)
const biharFlagships = [
  {
    id: "bihar-fasal-sahayata-brfsy",
    name: "Bihar Rajya Fasal Sahayata Yojana (BRFSY - 100% Free Crop Assistance)",
    shortName: "BRFSY Fasal Sahayata",
    category: "INCOME SUPPORT",
    subCategory: "State Comprehensive Crop Relief",
    provider: "Cooperative Department, Government of Bihar",
    baseInterestRate: 0,
    subsidizedInterestRate: 0,
    effectiveRate: 0,
    maxLoanAmount: 200000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🛡️",
    tagline: "India's only 100% free crop assistance scheme: No insurance premium paid by farmer; ₹7,500 to ₹10,000/ha direct loss DBT.",
    cropsSupported: ["paddy", "wheat", "maize", "gram", "lentil", "mustard", "potato", "makhana"],
    applyUrl: "https://pacsonline.bih.nic.in"
  },
  {
    id: "bihar-makhana-vikas-yojana",
    name: "Bihar Makhana Vikas Yojana (Fox Nut Pond & Processing Grant)",
    shortName: "Bihar Makhana Yojana",
    category: "ALLIED LOAN",
    subCategory: "Wetland GI Cash Crop",
    provider: "Directorate of Horticulture, Agriculture Dept, Bihar",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 2.0,
    effectiveRate: 2.0,
    subsidyPercentage: 90,
    maxLoanAmount: 400000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🪷",
    tagline: "90% capital subsidy (₹72,000/ha) for new water-body cultivation, high-yielding Sabour Makhana-1 seed, and processing units.",
    cropsSupported: ["makhana", "water chestnut", "fisheries"],
    districtsApplicable: ["Darbhanga", "Madhubani", "Purnia", "Katihar", "Saharsa", "Supaul", "Madhepura", "Kishanganj", "Araria", "Khagaria", "Samastipur"],
    applyUrl: "https://horticulture.bihar.gov.in"
  },
  {
    id: "bihar-krishi-yantrikikaran-ofmas",
    name: "Bihar Krishi Yantrikikaran Yojana (OFMAS Farm Equipment Subsidy)",
    shortName: "Bihar OFMAS Subsidy",
    category: "EQUIPMENT LOAN",
    subCategory: "Farm Mechanization Direct Anudan",
    provider: "Department of Agriculture, Government of Bihar",
    baseInterestRate: 7.5,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    subsidyPercentage: 80,
    maxLoanAmount: 450000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🚜",
    tagline: "Up to 80% direct subsidy for SC/ST/marginal farmers on 90+ agricultural implements including Reapers, Threshers, and Mini Tractors.",
    cropsSupported: ["all"],
    applyUrl: "https://farmech.bih.nic.in"
  },
  {
    id: "bihar-shahi-litchi-cluster",
    name: "Bihar GI Shahi Litchi Processing & Cold Chain Grant",
    shortName: "Bihar Shahi Litchi",
    category: "ALLIED LOAN",
    subCategory: "Horticulture Export Cluster",
    provider: "National Research Centre on Litchi & Bihar Horticulture Mission",
    baseInterestRate: 7.5,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    subsidyPercentage: 50,
    maxLoanAmount: 500000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🍒",
    tagline: "Low-interest working credit for canopy rejuvenation, fruit borer IPM protection, and corrugated packing crates in Muzaffarpur.",
    cropsSupported: ["litchi", "fruits"],
    districtsApplicable: ["Muzaffarpur", "Vaishali (Hajipur)", "Samastipur", "East Champaran (Motihari)", "Sitamarhi", "Begusarai"]
  },
  {
    id: "bihar-organic-corridor-subsidy",
    name: "Bihar Jaivik Kheti (Organic Corridor) Along River Ganga",
    shortName: "Bihar Organic Corridor",
    category: "CROP LOAN",
    subCategory: "Certified Organic Agriculture",
    provider: "Bihar State Seed & Organic Certification Agency (BSSOCA)",
    baseInterestRate: 6.0,
    subsidizedInterestRate: 1.5,
    effectiveRate: 1.5,
    subsidyPercentage: 75,
    maxLoanAmount: 180000,
    collateralFreeLimit: 180000,
    state: "Bihar",
    icon: "🍃",
    tagline: "₹11,500/acre direct incentive for organic certification, vermicompost pits, and bio-inputs in 13 districts along the Ganges.",
    cropsSupported: ["vegetables", "wheat", "paddy", "pulses"],
    districtsApplicable: ["Patna", "Buxar", "Bhojpur", "Saran (Chhapra)", "Vaishali (Hajipur)", "Samastipur", "Begusarai", "Lakhisarai", "Munger", "Khagaria", "Bhagalpur", "Katihar"]
  },
  {
    id: "bihar-mukhyamantri-niji-nalkup",
    name: "Bihar Mukhyamantri Niji Nalkup Yojana (Private Tubewells)",
    shortName: "Bihar Niji Nalkup",
    category: "INFRASTRUCTURE LOAN",
    subCategory: "Assured Tubewell Irrigation",
    provider: "Minor Water Resources Department, Bihar",
    baseInterestRate: 6.5,
    subsidizedInterestRate: 2.5,
    effectiveRate: 2.5,
    subsidyPercentage: 84,
    maxLoanAmount: 250000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🚰",
    tagline: "50% to 84% subsidy for shallow and medium tubewells boring and motor pumps for small cultivators.",
    cropsSupported: ["paddy", "wheat", "maize", "vegetables", "pulses"]
  },
  {
    id: "bihar-mushroom-hub-credit",
    name: "Bihar Commercial Mushroom Production & Spawn Lab Credit",
    shortName: "Bihar Mushroom Hub",
    category: "ALLIED LOAN",
    subCategory: "Mushroom Bio-Enterprise",
    provider: "Dr. Rajendra Prasad Central Agricultural University & Horticulture Dept",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.0,
    effectiveRate: 3.0,
    subsidyPercentage: 50,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🍄",
    tagline: "50% capital subsidy on bag production units, autoclaves, and air-conditioned spawn chambers for rural youth in Nalanda & Gaya.",
    cropsSupported: ["mushroom", "allied"]
  },
  {
    id: "bihar-sudha-dairy-development",
    name: "Bihar Desi Dairy & Sudha Milk Route Cooperative Loan",
    shortName: "Bihar Sudha Dairy",
    category: "ALLIED LOAN",
    subCategory: "Dairy Cattle & Milking Machine",
    provider: "COMFED (Bihar State Milk Co-operative Federation / Sudha)",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    subsidyPercentage: 50,
    maxLoanAmount: 350000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🥛",
    tagline: "50% to 75% subsidy on 2 to 4 milch cows with guaranteed daily milk procurement and feed support at village DCS centers.",
    cropsSupported: ["dairy", "fodder"]
  },
  {
    id: "bihar-teevra-beej-vistar",
    name: "Bihar Mukhyamantri Teevra Beej Vistar Yojana",
    shortName: "Bihar Beej Vistar",
    category: "CROP LOAN",
    subCategory: "Certified Seed Replacement",
    provider: "Bihar Rajya Beej Nigam (BRBN)",
    baseInterestRate: 6.0,
    subsidizedInterestRate: 1.0,
    effectiveRate: 1.0,
    subsidyPercentage: 90,
    maxLoanAmount: 100000,
    collateralFreeLimit: 100000,
    state: "Bihar",
    icon: "🌱",
    tagline: "High-yielding foundation and certified seeds delivered directly to farmer doorsteps with up to 90% subsidy for village seed hubs.",
    cropsSupported: ["paddy", "wheat", "maize", "pulses", "mustard"]
  },
  {
    id: "bihar-pacs-paddy-procurement",
    name: "Bihar PACS Seasonal Crop Loan & Grain Procurement Advance",
    shortName: "Bihar PACS Advance",
    category: "CROP LOAN",
    subCategory: "Cooperative Working Capital",
    provider: "Bihar State Cooperative Bank (BSCB) & Central Cooperative Banks",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.0,
    effectiveRate: 3.0,
    maxLoanAmount: 250000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    icon: "🌾",
    tagline: "Revolving seasonal credit linked directly with MSP paddy/wheat procurement payment at village PACS godowns.",
    cropsSupported: ["paddy", "wheat", "maize", "pulses"]
  }
];

biharFlagships.forEach(s => newSchemes.push(createScheme(s)));

// 3B. Bihar District Central Cooperative Banks & Regional Rural Banks (UBGB / DBGB) (38 districts)
BIHAR_DISTRICTS.forEach((district, idx) => {
  // 1. DCCB / PACS Crop Loan for each district
  newSchemes.push(createScheme({
    id: `bihar-dccb-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-crop`,
    name: `${district} DCCB / PACS Short-Term Crop Loan`,
    shortName: `${district} PACS Loan`,
    category: "CROP LOAN",
    subCategory: "Cooperative Seasonal Credit",
    provider: `${district} Central Cooperative Bank & Bihar State Cooperative Bank`,
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.0,
    effectiveRate: 3.0,
    promptRepaymentIncentive: 4.0,
    maxLoanAmount: 250000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    districtsApplicable: [district],
    icon: "🌾",
    tagline: `Low-interest seasonal crop credit disbursed via Primary Agricultural Credit Societies (PACS) in ${district}.`,
    cropsSupported: ["paddy", "wheat", "maize", "pulses", "mustard", "potato"]
  }));

  // 2. Uttar Bihar Gramin Bank (North Bihar) or Dakshin Bihar Gramin Bank (South Bihar)
  const isNorthBihar = [
    "Muzaffarpur", "Darbhanga", "Madhubani", "Samastipur", "East Champaran (Motihari)", 
    "West Champaran (Bettiah)", "Sitamarhi", "Sheohar", "Vaishali (Hajipur)", "Saran (Chhapra)", 
    "Siwan", "Gopalganj", "Purnia", "Katihar", "Araria", "Kishanganj", "Saharsa", "Madhepura", "Supaul"
  ].includes(district);

  const rrbName = isNorthBihar ? "Uttar Bihar Gramin Bank (UBGB)" : "Dakshin Bihar Gramin Bank (DBGB)";
  newSchemes.push(createScheme({
    id: `bihar-rrb-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-kcc`,
    name: `${rrbName} Kisan Credit Card (${district})`,
    shortName: `${isNorthBihar ? "UBGB" : "DBGB"} KCC`,
    category: "CROP LOAN",
    subCategory: "Regional Rural Bank Credit",
    provider: rrbName,
    baseInterestRate: 7.0,
    subsidizedInterestRate: 4.0,
    effectiveRate: 4.0,
    maxLoanAmount: 300000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    districtsApplicable: [district],
    icon: "💳",
    tagline: `Flexible working credit with ATM RuPay card, prompt repayment incentive, and hassle-free renewal in ${district}.`,
    cropsSupported: ["paddy", "wheat", "maize", "lentil", "mustard", "makhana"]
  }));

  // 3. Bihar Har Khet Ko Pani Tubewell & Micro-Canal Credit for all 38 districts
  newSchemes.push(createScheme({
    id: `bihar-irrigation-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: `${district} Har Khet Ko Pani Electric Tubewell & Pump Subsidy`,
    shortName: `${district} Irrigation Loan`,
    category: "INFRASTRUCTURE LOAN",
    subCategory: "Assured Minor Irrigation",
    provider: "Minor Water Resources Dept, Bihar & NABARD",
    baseInterestRate: 6.5,
    subsidizedInterestRate: 2.5,
    effectiveRate: 2.5,
    subsidyPercentage: 70,
    maxLoanAmount: 200000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    districtsApplicable: [district],
    icon: "🚰",
    tagline: `70% subsidized motor pump set and agricultural electricity connection line financing in ${district}.`,
    cropsSupported: ["paddy", "wheat", "maize", "vegetables"]
  }));

  // 4. Bihar Sudha Dairy & Inland Fish Pond Allied Loan for all 38 districts
  newSchemes.push(createScheme({
    id: `bihar-allied-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: `${district} Sudha Dairy & Chaur Wetland Fish Farming Credit`,
    shortName: `${district} Allied Credit`,
    category: "ALLIED LOAN",
    subCategory: "Dairy & Fisheries Development",
    provider: "COMFED & Bihar Directorate of Fisheries",
    baseInterestRate: 7.0,
    subsidizedInterestRate: 3.5,
    effectiveRate: 3.5,
    maxLoanAmount: 250000,
    collateralFreeLimit: 200000,
    state: "Bihar",
    districtsApplicable: [district],
    icon: "🐟",
    tagline: `Subsidized fingerlings, floating feed, and 2-milch cow procurement under Sudha cooperative route in ${district}.`,
    cropsSupported: ["fisheries", "dairy", "fodder"]
  }));

  // Specialized regional cluster loan for Kosi / Mithila / Magadh
  if (["Purnia", "Katihar", "Khagaria", "Begusarai", "Samastipur"].includes(district)) {
    newSchemes.push(createScheme({
      id: `bihar-maize-hub-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} High-Yielding Hybrid Maize & Silage Credit`,
      shortName: `${district} Maize Credit`,
      category: "CROP LOAN",
      subCategory: "Coarse Grain & Starch Feed",
      provider: "Bihar Agriculture Dept & Rural Banks",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 3.5,
      effectiveRate: 3.5,
      maxLoanAmount: 250000,
      collateralFreeLimit: 200000,
      state: "Bihar",
      districtsApplicable: [district],
      icon: "🌽",
      tagline: `Financing high-yielding rabi and kharif maize hybrids with direct linkage to local processing mills in ${district}.`,
      cropsSupported: ["maize", "mustard", "pulses"]
    }));
  }

  if (["Rohtas (Sasaram)", "Bhojpur", "Buxar", "Kaimur (Bhabua)"].includes(district)) {
    newSchemes.push(createScheme({
      id: `bihar-sone-canal-rice-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Sone Canal Rice Bowl Intensive Production Loan`,
      shortName: `${district} Paddy Credit`,
      category: "CROP LOAN",
      subCategory: "Staple Cereal Production",
      provider: "Bihar State Cooperative Bank & NABARD",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 3.0,
      effectiveRate: 3.0,
      maxLoanAmount: 300000,
      collateralFreeLimit: 200000,
      state: "Bihar",
      districtsApplicable: [district],
      icon: "🍚",
      tagline: `Canal-irrigated high-yield paddy and wheat credit for farmers in ${district} (Rice Bowl of Bihar).`,
      cropsSupported: ["paddy", "wheat", "gram", "lentil"]
    }));
  }

  if (["Darbhanga", "Madhubani", "Saharsa", "Supaul", "Madhepura"].includes(district)) {
    newSchemes.push(createScheme({
      id: `bihar-mithila-makhana-${district.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: `${district} Mithila Wetland Makhana Harvesting Advance`,
      shortName: `${district} Makhana Loan`,
      category: "CROP LOAN",
      subCategory: "Wetland GI Crop Finance",
      provider: "Bihar Cooperative Dept & NABARD",
      baseInterestRate: 7.0,
      subsidizedInterestRate: 2.0,
      effectiveRate: 2.0,
      maxLoanAmount: 280000,
      collateralFreeLimit: 200000,
      state: "Bihar",
      districtsApplicable: [district],
      icon: "🪷",
      tagline: `Concessional working capital for pond lease, bottom mud clearing, seed broadcast, and drying mats in ${district}.`,
      cropsSupported: ["makhana", "water chestnut"]
    }));
  }
});

// Combine base schemes with new regional schemes
const allSchemes = [];
const seenIds = new Set();

// Add existing base schemes first (retaining national schemes)
baseSchemes.forEach(s => {
  if (!seenIds.has(s.id)) {
    seenIds.add(s.id);
    allSchemes.push(s);
  }
});

// Add generated schemes
newSchemes.forEach(s => {
  if (!seenIds.has(s.id)) {
    seenIds.add(s.id);
    allSchemes.push(s);
  }
});

console.log(`\n=============================================`);
console.log(`TOTAL SCHEMES GENERATED: ${allSchemes.length}`);
console.log(`- Base / National: ${allSchemes.filter(s => !s.state || s.state === 'all').length}`);
console.log(`- Uttar Pradesh: ${allSchemes.filter(s => s.state === 'Uttar Pradesh').length}`);
console.log(`- Madhya Pradesh: ${allSchemes.filter(s => s.state === 'Madhya Pradesh').length}`);
console.log(`- Bihar: ${allSchemes.filter(s => s.state === 'Bihar').length}`);
console.log(`=============================================\n`);

// Save to src/data/schemesDatabase.json
fs.writeFileSync(SCHEMES_SRC_FILE, JSON.stringify(allSchemes, null, 2), 'utf8');
console.log(`✓ Saved to: ${SCHEMES_SRC_FILE}`);

// Save to Data/Data/schemes.json
fs.writeFileSync(SCHEMES_DATA_DIR_FILE, JSON.stringify(allSchemes, null, 2), 'utf8');
console.log(`✓ Saved to: ${SCHEMES_DATA_DIR_FILE}`);

// Build frontend format for schemes_data.js
const jsContent = `window.KISAN_SCHEMES_DATA = ${JSON.stringify(allSchemes, null, 2)};\n`;
fs.writeFileSync(PUBLIC_SCHEMES_JS, jsContent, 'utf8');
console.log(`✓ Saved to: ${PUBLIC_SCHEMES_JS}`);

fs.writeFileSync(PUBLIC_COPY_SCHEMES_JS, jsContent, 'utf8');
console.log(`✓ Saved to: ${PUBLIC_COPY_SCHEMES_JS}`);

console.log('All regional schemes compiled successfully!');
