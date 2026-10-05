/**
 * KisanSahay 15 National Agricultural, Rural Finance & Loan Scheme Categories
 * Updated to replace generic non-agricultural terms with famous Indian Government Loan & Subsidy Schemes:
 * - Kisan Credit Card (KCC) Crop Loans
 * - PM-KISAN Samman & Allied Credit
 * - Agriculture Infrastructure Fund (AIF)
 * - Pradhan Mantri Mudra Yojana (PMMY)
 * - Animal Husbandry & Dairy Infrastructure (AHIDF)
 * - Farm Mechanization & Tractor Subsidy (SMAM)
 * - PM-KUSUM Solar Irrigation Loans
 * - NABARD Dairy Entrepreneurship Loans (DEDS)
 * - Stand-Up India Agri & Rural Enterprise
 * - SHG-Bank Linkage Loans (DAY-NRLM)
 * - PMFME Micro Food Processing Loans
 * - Fisheries & Aquaculture Infrastructure (FIDF)
 * Enhanced with dual-mode high-contrast graphics and AI-generated category banners.
 */

(function () {
  'use strict';

  // 15 National Categories & Famous Government Loan Schemes
  window.NATIONAL_CATEGORIES = [
    {
      id: 'agriculture',
      name: 'Agriculture, Rural & Environment',
      hindiName: 'कृषि, ग्रामीण एवं पर्यावरण',
      count: 909,
      accentColor: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M12 20V10"/><path d="M12 10a5 5 0 0 1-5-5c0-1.5.5-2.5 1-3 1.5 2 3.5 3 6 3s4.5-1 6-3c.5.5 1 1.5 1 3a5 5 0 0 1-5 5"/><path d="M5 20c0-4.5 3-7 7-7s7 2.5 7 7"/></svg>`,
      bannerTheme: 'agriculture',
      bannerImg: '/assets/banners/agri_scheme_banner.jpg',
      description: 'Comprehensive farm credit, crop subsidies, irrigation development, and sustainable rural livelihood initiatives.'
    },
    {
      id: 'banking',
      name: 'Banking, Financial Services and Insurance',
      hindiName: 'बैंकिंग, वित्तीय सेवाएं एवं बीमा',
      count: 354,
      accentColor: '#f97316',
      bgGlow: 'rgba(249, 115, 22, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 10 12 3 19 10"/><line x1="7" y1="10" x2="7" y2="21"/><line x1="12" y1="10" x2="12" y2="21"/><line x1="17" y1="10" x2="17" y2="21"/></svg>`,
      bannerTheme: 'banking',
      bannerImg: '/assets/banners/banking_scheme_banner.jpg',
      description: 'Zero-collateral micro-loans, insurance subsidies, Jan Dhan accounts, and social security pension schemes.'
    },
    {
      id: 'business',
      name: 'Business & Entrepreneurship',
      hindiName: 'व्यापार एवं उद्यमिता',
      count: 825,
      accentColor: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.8-2.8L15 14"/><path d="m14 13-1.5-1.5"/><path d="M19 10V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/></svg>`,
      bannerTheme: 'business',
      bannerImg: '/assets/banners/business_scheme_banner.jpg',
      description: 'Startup India seed funding, MSME credit guarantee, Mudra loans, and market expansion support for rural enterprises.'
    },
    {
      id: 'kcc-loans',
      name: 'Kisan Credit Card (KCC) Crop Loans',
      hindiName: 'किसान क्रेडिट कार्ड (KCC) फसल ऋण',
      count: 482,
      accentColor: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M7 15h2"/><path d="M11 15h4"/></svg>`,
      bannerTheme: 'kcc',
      bannerImg: '/assets/banners/banking_scheme_banner.jpg',
      description: 'Institutional short-term crop loans up to ₹3,00,000 at 4% effective interest rate with 3% prompt repayment subvention and collateral-free limit of ₹1,60,000.'
    },
    {
      id: 'pm-kisan',
      name: 'PM-KISAN Samman & Allied Credit',
      hindiName: 'पीएम-किसान सम्मान एवं संबंधित साख',
      count: 320,
      accentColor: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`,
      bannerTheme: 'pmkisan',
      bannerImg: '/assets/banners/agri_scheme_banner.jpg',
      description: 'Direct income support of ₹6,000 annually via DBT plus priority saturation access to zero-collateral agricultural credit and allied bank facilities.'
    },
    {
      id: 'aif-schemes',
      name: 'Agriculture Infrastructure Fund (AIF)',
      hindiName: 'कृषि अवसंरचना कोष (AIF)',
      count: 215,
      accentColor: '#8b5cf6',
      bgGlow: 'rgba(139, 92, 246, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-3"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>`,
      bannerTheme: 'aif',
      bannerImg: '/assets/banners/agri_scheme_banner.jpg',
      description: 'Medium to long term debt financing facility for investment in viable post-harvest management and community farming assets with 3% interest subvention up to ₹2 Crore.'
    },
    {
      id: 'mudra-loans',
      name: 'Pradhan Mantri Mudra Yojana (PMMY)',
      hindiName: 'प्रधानमंत्री मुद्रा योजना (PMMY)',
      count: 410,
      accentColor: '#0ea5e9',
      bgGlow: 'rgba(14, 165, 233, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><circle cx="18" cy="12" r="2"/></svg>`,
      bannerTheme: 'mudra',
      bannerImg: '/assets/banners/business_scheme_banner.jpg',
      description: 'Collateral-free micro loans across Shishu (up to ₹50,000), Kishore (₹50,000 to ₹5 Lakhs), and Tarun (up to ₹20 Lakhs) for agri-allied, processing, and rural businesses.'
    },
    {
      id: 'ahidf-schemes',
      name: 'Animal Husbandry & Dairy Infrastructure (AHIDF)',
      hindiName: 'पशुपालन एवं डेयरी अवसंरचना कोष (AHIDF)',
      count: 184,
      accentColor: '#ec4899',
      bgGlow: 'rgba(236, 72, 153, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg>`,
      bannerTheme: 'ahidf',
      bannerImg: '/assets/banners/agri_scheme_banner.jpg',
      description: '₹15,000 Crore fund offering up to 90% loan backing, 3% interest subvention, and 25% credit guarantee for dairy processing, meat plants, and animal feed manufacturing.'
    },
    {
      id: 'smam-tractor',
      name: 'Farm Mechanization & Tractor Subsidy (SMAM)',
      hindiName: 'कृषि यंत्रीकरण एवं ट्रैक्टर सब्सिडी (SMAM)',
      count: 260,
      accentColor: '#eab308',
      bgGlow: 'rgba(234, 179, 8, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="17" r="4"/><circle cx="18" cy="15" r="3"/><path d="M7 13h4l3-6h4v8"/><path d="M10 7V4H5v3"/></svg>`,
      bannerTheme: 'smam',
      bannerImg: '/assets/banners/agri_scheme_banner.jpg',
      description: 'Sub-Mission on Agricultural Mechanization offering 40% to 50% capital subsidy on tractors, power tillers, rotavators, drone sprayers, and Custom Hiring Centers (CHCs).'
    },
    {
      id: 'pm-kusum',
      name: 'PM-KUSUM Solar Irrigation Loans & Subsidies',
      hindiName: 'पीएम-कुसुम सौर सिंचाई योजना',
      count: 175,
      accentColor: '#14b8a6',
      bgGlow: 'rgba(20, 184, 166, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
      bannerTheme: 'kusum',
      bannerImg: '/assets/banners/agri_scheme_banner.jpg',
      description: '60% capital subsidy (30% Central + 30% State) with 30% bank loan for installing standalone solar agricultural pumps and solarizing existing grid-connected tube-wells.'
    },
    {
      id: 'nabard-deds',
      name: 'NABARD Dairy Entrepreneurship Loans (DEDS)',
      hindiName: 'नाबार्ड डेयरी उद्यमिता विकास योजना',
      count: 198,
      accentColor: '#3b82f6',
      bgGlow: 'rgba(59, 130, 246, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z"/><path d="M2 10l10-7 10 7"/><path d="M10 22v-6h4v6"/></svg>`,
      bannerTheme: 'nabard',
      bannerImg: '/assets/banners/banking_scheme_banner.jpg',
      description: '25% (33.33% for SC/ST/women) back-ended capital subsidy on commercial loans for setting up mini dairy units, purchasing milch cows/buffaloes, and cold milk storage.'
    },
    {
      id: 'standup-india',
      name: 'Stand-Up India Agri & Rural Enterprise',
      hindiName: 'स्टैंड-अप इंडिया कृषि एवं ग्रामीण उद्यम',
      count: 142,
      accentColor: '#f43f5e',
      bgGlow: 'rgba(244, 63, 94, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
      bannerTheme: 'standup',
      bannerImg: '/assets/banners/business_scheme_banner.jpg',
      description: 'Facilitates bank loans between ₹10 Lakhs and ₹1 Crore to at least one SC/ST and one woman borrower per bank branch for setting up greenfield agri-enterprises and processing units.'
    },
    {
      id: 'shg-nrlm',
      name: 'SHG-Bank Linkage Loans (DAY-NRLM)',
      hindiName: 'स्वयं सहायता समूह बैंक लिंकेज (DAY-NRLM)',
      count: 310,
      accentColor: '#d946ef',
      bgGlow: 'rgba(217, 70, 239, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d946ef" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      bannerTheme: 'shg',
      bannerImg: '/assets/banners/banking_scheme_banner.jpg',
      description: 'Collateral-free loans up to ₹20 Lakhs for Women Self Help Groups at subsidized interest rate of 7% per annum with 3% additional prompt repayment subvention.'
    },
    {
      id: 'pmfme',
      name: 'PMFME Micro Food Processing Loans',
      hindiName: 'पीएम सूक्ष्म खाद्य प्रसंस्करण उद्यम (PMFME)',
      count: 165,
      accentColor: '#fb923c',
      bgGlow: 'rgba(251, 146, 60, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
      bannerTheme: 'pmfme',
      bannerImg: '/assets/banners/business_scheme_banner.jpg',
      description: '35% credit-linked capital subsidy up to ₹10 Lakhs for modernizing micro food processing units under One District One Product (ODOP) with seed capital support.'
    },
    {
      id: 'fidf-fisheries',
      name: 'Fisheries & Aquaculture Infrastructure (FIDF)',
      hindiName: 'मत्स्य पालन एवं जलीय कृषि अवसंरचना (FIDF)',
      count: 112,
      accentColor: '#0284c7',
      bgGlow: 'rgba(2, 132, 199, 0.18)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 12c-3.5 0-6-3-6-3s-2.5 3-6 3 0 4 6 4 6-4 6-4z"/><path d="M12 9V5"/><path d="M2 12s3-5 10-5 10 5 10 5-3 5-10 5S2 12 2 12z"/></svg>`,
      bannerTheme: 'fidf',
      bannerImg: '/assets/banners/agri_scheme_banner.jpg',
      description: 'Concessional finance through NCDC, NABARD, and scheduled commercial banks with up to 3% interest subvention for fishing harbors, cold chains, and cage culture ponds.'
    }
  ];

  // Flagship Category Schemes
  window.FLAGSHIP_CATEGORY_SCHEMES = [
    // 1. Agriculture, Rural & Environment
    {
      id: 'cat-agri-coffee',
      categoryId: 'agriculture',
      title: 'Coffee Development Programme in North Eastern Region: Expansion of Coffee',
      ministry: 'Ministry Of Commerce And Industry',
      description: 'The scheme "Coffee Development Programme in North Eastern Region: Expansion of Coffee" by the Coffee Board, Department of Commerce, Ministry of Commerce and Industry, aims to facilitate afforestation in the Jhum lands and help settle the tribals on a stable agro-forestry economic model.',
      tags: ['Agriculture', 'DBT', 'Farmer', 'Subsidy'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Subsidy & Planting Material',
      applyUrl: 'https://www.indiacoffee.org/'
    },
    {
      id: 'cat-agri-pm-kisan',
      categoryId: 'agriculture',
      title: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Direct income support of ₹6,000 per annum in three equal installments of ₹2,000 directly into the bank accounts of all land-holding farmer families across India via Aadhaar-linked DBT.',
      tags: ['Agriculture', 'DBT', 'Income Support', 'Farmer'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Direct Cash Transfer',
      applyUrl: 'https://pmkisan.gov.in/'
    },
    {
      id: 'cat-agri-rkvy',
      categoryId: 'agriculture',
      title: 'Rashtriya Krishi Vikas Yojana (RKVY-RAFTAAR)',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Remunerative approaches for agriculture rejuvenation providing up to 50% capital subsidy for farm mechanization, solar pump sets, and farmer producer organization (FPO) development.',
      tags: ['Agriculture', 'Subsidy', 'Infrastructure', 'FPO'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Financial Grant (50%)',
      applyUrl: 'https://rkvy.nic.in/'
    },
    {
      id: 'cat-agri-up-khet-talab',
      categoryId: 'agriculture',
      title: 'Uttar Pradesh Khet Talab Yojana (Farm Pond Subsidy)',
      ministry: 'Department of Agriculture, Uttar Pradesh',
      description: 'State government initiative providing 50% direct subsidy up to ₹52,500 for digging farm ponds to harvest rainwater and recharge underground water tables across Bundelkhand and Purvanchal.',
      tags: ['Agriculture', 'State Scheme', 'Irrigation', 'Subsidy'],
      scope: 'state',
      state: 'Uttar Pradesh',
      gender: 'all',
      benefitType: '50% Construction Subsidy',
      applyUrl: 'http://upagripardarshi.gov.in/'
    },
    {
      id: 'cat-agri-bihar-diesel',
      categoryId: 'agriculture',
      title: 'Bihar Diesel Anudan Yojana (Irrigation Fuel Subsidy)',
      ministry: 'Department of Agriculture, Bihar',
      description: 'Direct cash subsidy of ₹75 per litre up to ₹750 per acre per irrigation cycle to small and marginal farmers for tube-well diesel pumping during erratic monsoon periods.',
      tags: ['Agriculture', 'State Scheme', 'Irrigation', 'DBT'],
      scope: 'state',
      state: 'Bihar',
      gender: 'all',
      benefitType: '₹750/acre DBT Subsidy',
      applyUrl: 'https://dbtagriculture.bihar.gov.in/'
    },

    // 2. Kisan Credit Card (KCC)
    {
      id: 'cat-kcc-crop-loan',
      categoryId: 'kcc-loans',
      title: 'Kisan Credit Card (KCC) Concessional Crop Loan',
      ministry: 'Ministry Of Agriculture & NABARD',
      description: 'Short-term credit for crop cultivation up to ₹3 Lakhs at 7% baseline interest with 3% prompt repayment incentive, reducing net interest to 4% per annum. No collateral required up to ₹1.60 Lakhs.',
      tags: ['Crop Loan', 'Subvention', 'Collateral-Free', 'KCC'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '4% Interest Rate Loan',
      applyUrl: 'https://www.nabard.org/'
    },
    {
      id: 'cat-kcc-animal-husbandry',
      categoryId: 'kcc-loans',
      title: 'KCC for Animal Husbandry & Fisheries Working Capital',
      ministry: 'Ministry Of Fisheries, Animal Husbandry & Dairying',
      description: 'Working capital loan up to ₹2 Lakhs at 4% effective interest for dairy, poultry, sheep/goat rearing, and fisheries with simplified documentation and RuPay Kisan Card debit access.',
      tags: ['Animal Husbandry', 'Dairy', 'Working Capital', 'KCC'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Working Capital up to ₹2 Lakhs',
      applyUrl: 'https://dahd.nic.in/'
    },
    {
      id: 'cat-kcc-pm-kisan-saturation',
      categoryId: 'kcc-loans',
      title: 'Kisan Rin Portal (KRP) Ghar Ghar KCC Saturation',
      ministry: 'Department of Agriculture and Farmers Welfare',
      description: 'Drive ensuring every PM-KISAN beneficiary receives instant digital Kisan Credit Card processing at rural bank branches with unified biometric e-KYC and zero processing fees.',
      tags: ['Saturation', 'KRP', 'Digital KCC', 'Zero Fee'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Instant Credit Sanction',
      applyUrl: 'https://krp.agricoop.gov.in/'
    },

    // 3. PM-KISAN Samman & Allied
    {
      id: 'cat-pmkisan-direct-benefit',
      categoryId: 'pm-kisan',
      title: 'PM-KISAN 17th Installment Direct Benefit Transfer',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Direct financial assistance of ₹2,000 every 4 months directly to farmer bank accounts through PFMS portal with Aadhaar e-KYC and land-seeding verification.',
      tags: ['PM-KISAN', 'DBT', 'Income Support', 'Central'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '₹6,000/year Cash',
      applyUrl: 'https://pmkisan.gov.in/'
    },
    {
      id: 'cat-pmkisan-pm-kmy',
      categoryId: 'pm-kisan',
      title: 'Pradhan Mantri Kisan Maan-Dhan Yojana (PM-KMY)',
      ministry: 'Ministry Of Agriculture & LIC of India',
      description: 'Old-age pension scheme for small and marginal farmers providing guaranteed monthly pension of ₹3,000 upon reaching 60 years with 50% matching contribution from Central Government.',
      tags: ['Pension', 'Social Security', 'PM-KMY', 'Farmer'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '₹3,000/month Pension',
      applyUrl: 'https://maandhan.in/'
    },

    // 4. Agriculture Infrastructure Fund (AIF)
    {
      id: 'cat-aif-post-harvest',
      categoryId: 'aif-schemes',
      title: 'AIF Term Loan for Post-Harvest Warehouses & Cold Chains',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Term loans up to ₹2 Crore for setting up warehouses, silos, pack-houses, sorting-grading units, cold storages, and ripening chambers with 3% interest subvention for 7 years.',
      tags: ['AIF', 'Cold Storage', 'Warehouse', 'Interest Subvention'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '3% Interest Subvention (₹2 Cr)',
      applyUrl: 'https://agriinfra.dac.gov.in/'
    },
    {
      id: 'cat-aif-cgtmse',
      categoryId: 'aif-schemes',
      title: 'AIF Credit Guarantee Scheme (CGTMSE)',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Credit guarantee coverage under CGTMSE for loans up to ₹2 Crore without demanding collateral property, enabling young agri-preneurs and FPOs to access bank financing.',
      tags: ['AIF', 'Credit Guarantee', 'CGTMSE', 'Agri-Tech'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Collateral-Free Guarantee',
      applyUrl: 'https://agriinfra.dac.gov.in/'
    },

    // 5. Mudra Loans
    {
      id: 'cat-mudra-shishu',
      categoryId: 'mudra-loans',
      title: 'PMMY Shishu Agri-Allied Loan (Up to ₹50,000)',
      ministry: 'Ministry Of Finance',
      description: 'Zero collateral loan up to ₹50,000 for rural artisans, vegetable vendors, dairy micro-sellers, and village traders with low documentation and flexible repayment schedules.',
      tags: ['Mudra', 'Shishu', 'Micro-Loan', 'Collateral-Free'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Loan up to ₹50,000',
      applyUrl: 'https://www.mudra.org.in/'
    },
    {
      id: 'cat-mudra-kishore',
      categoryId: 'mudra-loans',
      title: 'PMMY Kishore Agri-Business Loan (₹50,000 to ₹5 Lakhs)',
      ministry: 'Ministry Of Finance',
      description: 'Working capital and machinery loan from ₹50,000 to ₹5 Lakhs for expanding flour mills, oil expellers, honey packaging, and rural retail stores without collateral.',
      tags: ['Mudra', 'Kishore', 'Business', 'Machinery'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Loan ₹50K - ₹5 Lakhs',
      applyUrl: 'https://www.mudra.org.in/'
    },
    {
      id: 'cat-mudra-tarun',
      categoryId: 'mudra-loans',
      title: 'PMMY Tarun & Tarun Plus Enterprise Loan (Up to ₹20 Lakhs)',
      ministry: 'Ministry Of Finance',
      description: 'Growth capital loan up to ₹20 Lakhs for established rural manufacturing and agri-business enterprises with proven track record of timely credit repayment.',
      tags: ['Mudra', 'Tarun', 'Growth Capital', 'Enterprise'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Loan up to ₹20 Lakhs',
      applyUrl: 'https://www.mudra.org.in/'
    },

    // 6. Animal Husbandry & Dairy Infrastructure (AHIDF)
    {
      id: 'cat-ahidf-dairy-plant',
      categoryId: 'ahidf-schemes',
      title: 'AHIDF Dairy Processing and Value Addition Infrastructure',
      ministry: 'Ministry Of Fisheries, Animal Husbandry & Dairying',
      description: 'Credit support for setting up modern milk chilling centers, automated packaging, paneer/cheese manufacturing, and ice-cream plants with 3% interest subvention and 90% loan component.',
      tags: ['Dairy', 'Processing', 'AHIDF', 'Subvention'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '3% Subvention + 90% Loan',
      applyUrl: 'https://ahidf.udyamimitra.in/'
    },

    // 7. Farm Mechanization & Tractor Subsidy (SMAM)
    {
      id: 'cat-smam-tractor-subsidy',
      categoryId: 'smam-tractor',
      title: 'Sub-Mission on Agricultural Mechanization (SMAM) Tractor Grant',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Direct subsidy of 40% (up to 50% for SC/ST/Small & Marginal Farmers and Women) up to ₹1,00,000 to ₹1,50,000 for purchasing approved 2WD/4WD agricultural tractors.',
      tags: ['Mechanization', 'Tractor', 'SMAM', 'Capital Subsidy'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '40% - 50% Capital Subsidy',
      applyUrl: 'https://agrimachinery.nic.in/'
    },
    {
      id: 'cat-smam-chc',
      categoryId: 'smam-tractor',
      title: 'Custom Hiring Centers (CHC) Farm Machinery Subsidy',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Financial assistance of 40% up to ₹10 Lakhs (80% for FPOs up to ₹10 Lakhs) for establishing Custom Hiring Centers to rent modern implements to marginal farmers.',
      tags: ['CHC', 'Custom Hiring', 'FPO', 'Subsidy'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '40% - 80% Subsidy',
      applyUrl: 'https://agrimachinery.nic.in/'
    },

    // 8. PM-KUSUM Solar Irrigation
    {
      id: 'cat-kusum-solar-pump',
      categoryId: 'pm-kusum',
      title: 'PM-KUSUM Component-B: Standalone Solar Agricultural Pumps',
      ministry: 'Ministry Of New and Renewable Energy',
      description: 'Subsidies for individual farmers to install standalone solar water pumps up to 7.5 HP with 30% Central grant, 30% State grant, and 30% bank loan, leaving only 10% farmer share.',
      tags: ['Solar Pump', 'KUSUM', 'Renewable Energy', 'Subsidy'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '60% Combined Subsidy',
      applyUrl: 'https://pmkusum.mnre.gov.in/'
    },
    {
      id: 'cat-kusum-grid-solarization',
      categoryId: 'pm-kusum',
      title: 'PM-KUSUM Component-C: Solarization of Grid-Connected Pumps',
      ministry: 'Ministry Of New and Renewable Energy',
      description: 'Solarize existing electric tube-wells. Farmers can use solar power to irrigate crops and sell excess electricity generated back to the state DISCOM at guaranteed feed-in tariff.',
      tags: ['Solar Grid', 'KUSUM', 'Feed-in Tariff', 'Income'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '60% Subsidy + Grid Income',
      applyUrl: 'https://pmkusum.mnre.gov.in/'
    },

    // 9. NABARD Dairy Entrepreneurship (DEDS)
    {
      id: 'cat-deds-commercial-dairy',
      categoryId: 'nabard-deds',
      title: 'NABARD Commercial Dairy Farming (2 to 10 Milch Animals)',
      ministry: 'NABARD & Department of Animal Husbandry',
      description: 'Back-ended capital subsidy of 25% (33.33% for SC/ST) up to ₹1.75 Lakhs for establishing commercial dairy units of crossbred cows or graded Murrah buffaloes.',
      tags: ['NABARD', 'Dairy', 'DEDS', 'Back-ended Subsidy'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '25% - 33.33% Subsidy',
      applyUrl: 'https://www.nabard.org/'
    },

    // 10. Stand-Up India
    {
      id: 'cat-standup-greenfield',
      categoryId: 'standup-india',
      title: 'Stand-Up India Greenfield Agri-Processing Term Loan',
      ministry: 'Department of Financial Services, Ministry of Finance',
      description: 'Bank loans between ₹10 Lakhs and ₹1 Crore for greenfield projects in trading, manufacturing, or services sector including agricultural allied activities by SC/ST and Women borrowers.',
      tags: ['Stand-Up India', 'SC/ST', 'Women', 'Agri-Business'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Loan ₹10L - ₹1 Crore',
      applyUrl: 'https://www.standupmitra.in/'
    },

    // 11. SHG-Bank Linkage (DAY-NRLM)
    {
      id: 'cat-shg-nrlm-loan',
      categoryId: 'shg-nrlm',
      title: 'DAY-NRLM Women SHG Collateral-Free Bank Credit',
      ministry: 'Ministry Of Rural Development',
      description: 'Collateral-free credit linkage up to ₹20 Lakhs for verified Women Self Help Groups at 7% concessional interest with 3% prompt repayment subvention (effective 4%).',
      tags: ['SHG', 'NRLM', 'Women Credit', 'Collateral-Free'],
      scope: 'central',
      state: 'Central',
      gender: 'female',
      benefitType: 'Loan up to ₹20 Lakhs @ 4%',
      applyUrl: 'https://aajeevika.gov.in/'
    },

    // 12. PMFME Micro Food Processing
    {
      id: 'cat-pmfme-odop-grant',
      categoryId: 'pmfme',
      title: 'PMFME One District One Product (ODOP) Enterprise Subsidy',
      ministry: 'Ministry Of Food Processing Industries',
      description: '35% credit-linked capital subsidy up to ₹10 Lakhs for individual and group micro-enterprises for machinery, cold-rooms, oil mills, spice processing, and FSSAI packaging.',
      tags: ['PMFME', 'Food Processing', 'ODOP', 'Capital Subsidy'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '35% Capital Subsidy (₹10L)',
      applyUrl: 'https://pmfme.mofpi.gov.in/'
    },

    // 13. Fisheries (FIDF)
    {
      id: 'cat-fidf-aquaculture',
      categoryId: 'fidf-fisheries',
      title: 'FIDF Concessional Debt for Biofloc and Prawn Aquaculture',
      ministry: 'Ministry Of Fisheries, Animal Husbandry & Dairying',
      description: 'Low-interest loans with 3% interest subvention for constructing freshwater aquaculture ponds, RAS recirculation systems, hatcheries, and refrigerated fish vans.',
      tags: ['Fisheries', 'Aquaculture', 'FIDF', 'Subvention'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '3% Interest Subvention',
      applyUrl: 'https://nfdb.gov.in/'
    },

    // 14. Banking, Financial Services & Insurance
    {
      id: 'cat-bank-pmjdy',
      categoryId: 'banking',
      title: 'Pradhan Mantri Jan Dhan Yojana (PMJDY)',
      ministry: 'Ministry Of Finance',
      description: 'National mission for financial inclusion ensuring zero-balance bank accounts, RuPay debit card with ₹2 Lakhs accident cover, and ₹10,000 overdraft facility.',
      tags: ['Banking', 'Overdraft', 'Zero Balance', 'Insurance'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '₹10,000 Overdraft + Insurance',
      applyUrl: 'https://pmjdy.gov.in/'
    },
    {
      id: 'cat-bank-pmsby',
      categoryId: 'banking',
      title: 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)',
      ministry: 'Ministry Of Finance',
      description: 'Annual accident insurance scheme providing ₹2 Lakhs cover for accidental death or permanent total disability at an ultra-low premium of only ₹20 per year.',
      tags: ['Banking', 'Insurance', 'Accident Cover'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '₹2 Lakhs Cover for ₹20/year',
      applyUrl: 'https://www.jansuraksha.gov.in/'
    },

    // 15. Business & Entrepreneurship
    {
      id: 'cat-biz-mda',
      categoryId: 'business',
      title: 'Market Development Assistance',
      ministry: 'Ministry Of Chemicals And Fertilizers',
      description: 'The scheme aims to promote organic fertilizers produced at Bio-Gas and Compressed Bio-Gas plants under the Galvanizing Organic Bio-Agro Resources Dhan initiative. It provides Market Development Assistance of ₹1,500/- per Metric Tonne to manufacturing and marketing companies.',
      tags: ['Fertilizer', 'Institute', 'Manufacturer', 'Operator', 'Subsidy'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '₹1,500/MT Subsidy',
      applyUrl: 'https://chemicals.gov.in/'
    },
    {
      id: 'cat-biz-startup-seed',
      categoryId: 'business',
      title: 'Startup India Seed Fund Scheme (SISFS)',
      ministry: 'Department for Promotion of Industry and Internal Trade',
      description: 'Financial assistance up to ₹20 Lakhs as a grant for proof of concept, prototype development, and product trials, and up to ₹50 Lakhs for market entry and commercialization.',
      tags: ['Startup', 'Seed Fund', 'Innovation', 'Grant'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Up to ₹50 Lakhs Grant/Debt',
      applyUrl: 'https://seedfund.startupindia.gov.in/'
    }
  ];

  // Themed Vector Illustrated Hero Banners for all categories
  window.CATEGORY_HERO_BANNERS = {
    agriculture: `
      <div class="category-hero-art-wrapper" style="background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);">
        <svg width="100%" height="220" viewBox="0 0 1000 220" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <rect width="1000" height="220" fill="url(#agriSkyGrad)"/>
          <circle cx="850" cy="55" r="42" fill="#fef08a" fill-opacity="0.35" filter="blur(6px)"/>
          <circle cx="850" cy="55" r="28" fill="#fde047" fill-opacity="0.9"/>
          <path d="M0 160 Q 250 110 500 150 T 1000 130 L 1000 220 L 0 220 Z" fill="#065f46" fill-opacity="0.6"/>
          <path d="M0 180 Q 200 140 450 175 T 1000 160 L 1000 220 L 0 220 Z" fill="#047857" fill-opacity="0.8"/>
          <path d="M0 195 Q 300 170 600 200 T 1000 185 L 1000 220 L 0 220 Z" fill="#10b981" fill-opacity="0.9"/>
          <defs>
            <linearGradient id="agriSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#022c22"/><stop offset="50%" stop-color="#064e3b"/><stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,
    banking: `
      <div class="category-hero-art-wrapper" style="background: linear-gradient(135deg, #7c2d12 0%, #1c1917 100%);">
        <svg width="100%" height="220" viewBox="0 0 1000 220" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <rect width="1000" height="220" fill="url(#bankSkyGrad)"/>
          <path d="M720 180 L 800 130 L 880 180 Z" fill="#f97316" fill-opacity="0.3"/>
          <rect x="740" y="180" width="15" height="40" fill="#ea580c" fill-opacity="0.4"/>
          <rect x="792" y="180" width="15" height="40" fill="#ea580c" fill-opacity="0.4"/>
          <rect x="845" y="180" width="15" height="40" fill="#ea580c" fill-opacity="0.4"/>
          <defs>
            <linearGradient id="bankSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#431407"/><stop offset="60%" stop-color="#7c2d12"/><stop offset="100%" stop-color="#0c0a09"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,
    business: `
      <div class="category-hero-art-wrapper" style="background: linear-gradient(135deg, #164e63 0%, #082f49 100%);">
        <svg width="100%" height="220" viewBox="0 0 1000 220" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <rect width="1000" height="220" fill="url(#bizSkyGrad)"/>
          <path d="M600 180 L 680 120 L 760 145 L 860 80 L 920 110" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <defs>
            <linearGradient id="bizSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#083344"/><stop offset="60%" stop-color="#164e63"/><stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,
    kcc: `
      <div class="category-hero-art-wrapper" style="background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%);">
        <svg width="100%" height="220" viewBox="0 0 1000 220" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <rect width="1000" height="220" fill="url(#agriSkyGrad)"/>
          <rect x="700" y="70" width="160" height="100" rx="10" fill="#10b981" fill-opacity="0.3" stroke="#34d399" stroke-width="2"/>
          <line x1="700" y1="100" x2="860" y2="100" stroke="#34d399" stroke-width="2"/>
          <rect x="720" y="130" width="30" height="15" rx="3" fill="#fde047" fill-opacity="0.8"/>
        </svg>
      </div>
    `,
    default: `
      <div class="category-hero-art-wrapper" style="background: linear-gradient(135deg, #0b132b 0%, #1c2541 100%);">
        <svg width="100%" height="220" viewBox="0 0 1000 220" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <rect width="1000" height="220" fill="url(#defaultSkyGrad)"/>
          <defs>
            <linearGradient id="defaultSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0b132b"/><stop offset="50%" stop-color="#1c2541"/><stop offset="100%" stop-color="#0b132b"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `
  };

  /**
   * Helper to retrieve banner HTML for any category
   * Supports both AI-generated banner image and crisp vector SVG art.
   */
  window.getCategoryBannerHtml = function (categoryTheme, categoryObj) {
    const cat = categoryObj || (window.NATIONAL_CATEGORIES || []).find(c => c.bannerTheme === categoryTheme || c.id === categoryTheme);
    const bannerImg = cat ? cat.bannerImg : null;
    const fallbackSvg = window.CATEGORY_HERO_BANNERS[categoryTheme] || window.CATEGORY_HERO_BANNERS[cat?.bannerTheme] || window.CATEGORY_HERO_BANNERS.agriculture || window.CATEGORY_HERO_BANNERS.default;

    if (bannerImg) {
      return `
        <div class="category-hero-art-wrapper category-hero-img-wrapper" style="position: relative; overflow: hidden; background: #0f172a;">
          <img src="${bannerImg}" alt="${cat ? cat.name : 'Category Banner'}" class="category-hero-bg-img" style="width: 100%; height: 220px; object-fit: cover; display: block;" onerror="this.style.display='none'; const fb = this.nextElementSibling; if (fb) fb.style.display='block';">
          <div class="category-hero-fallback-svg" style="display: none;">
            ${fallbackSvg}
          </div>
          <div class="category-hero-img-gradient-overlay" style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(11, 19, 30, 0.94) 0%, rgba(11, 19, 30, 0.75) 45%, rgba(11, 19, 30, 0.35) 80%, rgba(11, 19, 30, 0.15) 100%); pointer-events: none;"></div>
        </div>
      `;
    }

    return fallbackSvg;
  };
})();
