/**
 * KisanSahay 15 National Scheme Categories & Flagship Scheme Directory
 * Matching reference screenshots (Images 1, 2, 3, 4, 5).
 * Enhanced with dual-mode high-contrast graphics and AI-generated category banners.
 */

(function () {
  'use strict';

  // 15 National Categories matching Image 5
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
      description: 'Startup India seed funding, MSME credit guarantee, Mudra loans, and market expansion support.'
    },
    {
      id: 'education',
      name: 'Education & Learning',
      hindiName: 'शिक्षा एवं शिक्षण',
      count: 1164,
      accentColor: '#f43f5e',
      bgGlow: 'rgba(244, 63, 94, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
      bannerTheme: 'education',
      bannerImg: '/assets/banners/education_scheme_banner.jpg',
      description: 'National pre-matric and post-matric scholarships, digital education vouchers, and higher education loan subventions.'
    },
    {
      id: 'health',
      name: 'Health & Wellness',
      hindiName: 'स्वास्थ्य एवं कल्याण',
      count: 292,
      accentColor: '#0ea5e9',
      bgGlow: 'rgba(14, 165, 233, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 9v6"/><path d="M9 12h6"/></svg>`,
      bannerTheme: 'health',
      bannerImg: '/assets/banners/health_scheme_banner.jpg',
      description: 'Ayushman Bharat cashless hospitalization, rural health cards, maternal nutrition, and emergency medical cover.'
    },
    {
      id: 'housing',
      name: 'Housing & Shelter',
      hindiName: 'आवास एवं आश्रय',
      count: 144,
      accentColor: '#3b82f6',
      bgGlow: 'rgba(59, 130, 246, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      bannerTheme: 'housing',
      description: 'Pradhan Mantri Awas Yojana (PMAY-Gramin), pucca house financial grants, and low-interest rural housing loans.'
    },
    {
      id: 'justice',
      name: 'Public Safety, Law & Justice',
      hindiName: 'सार्वजनिक सुरक्षा एवं न्याय',
      count: 34,
      accentColor: '#f97316',
      bgGlow: 'rgba(249, 115, 22, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`,
      bannerTheme: 'justice',
      description: 'Free legal aid clinics, land dispute resolution assistance, farmer rights legal advocacy, and cyber fraud helplines.'
    },
    {
      id: 'science',
      name: 'Science, IT & Communications',
      hindiName: 'विज्ञान, आईटी एवं संचार',
      count: 125,
      accentColor: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)"/></svg>`,
      bannerTheme: 'science',
      description: 'Digital India village connectivity, agri-tech innovation grants, satellite crop monitoring, and AI farming testbeds.'
    },
    {
      id: 'skills',
      name: 'Skills & Employment',
      hindiName: 'कौशल एवं रोजगार',
      count: 405,
      accentColor: '#eab308',
      bgGlow: 'rgba(234, 179, 8, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
      bannerTheme: 'skills',
      description: 'Pradhan Mantri Kaushal Vikas Yojana, rural youth tractor operator certifications, food processing training, and job fairs.'
    },
    {
      id: 'social',
      name: 'Social welfare & Empowerment',
      hindiName: 'समाज कल्याण एवं अधिकारिता',
      count: 1504,
      accentColor: '#fb923c',
      bgGlow: 'rgba(251, 146, 60, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
      bannerTheme: 'social',
      description: 'Scheduled Caste & Scheduled Tribe affirmative subsidies, Divyangjan disability benefits, and elderly farmer pensions.'
    },
    {
      id: 'sports',
      name: 'Sports & Culture',
      hindiName: 'खेल एवं संस्कृति',
      count: 303,
      accentColor: '#22c55e',
      bgGlow: 'rgba(34, 197, 94, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`,
      bannerTheme: 'sports',
      description: 'Khelo India rural sports infrastructure, traditional archery & wrestling stipends, and village cultural grants.'
    },
    {
      id: 'transport',
      name: 'Transport & Infrastructure',
      hindiName: 'परिवहन एवं अवसंरचना',
      count: 143,
      accentColor: '#eab308',
      bgGlow: 'rgba(234, 179, 8, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17v2"/><path d="M17 17v2"/><circle cx="8" cy="13" r="1"/><circle cx="16" cy="13" r="1"/><path d="M3 9h18"/></svg>`,
      bannerTheme: 'transport',
      description: 'PM Gram Sadak Yojana all-weather farm roads, cold-chain transport trucks, and agricultural freight subsidies.'
    },
    {
      id: 'tourism',
      name: 'Travel & Tourism',
      hindiName: 'यात्रा एवं पर्यटन',
      count: 97,
      accentColor: '#ec4899',
      bgGlow: 'rgba(236, 72, 153, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/><path d="m16 8 4-4"/></svg>`,
      bannerTheme: 'tourism',
      description: 'Agro-tourism farm stay incentives, rural eco-trail homestay subsidies, and heritage village preservation programs.'
    },
    {
      id: 'utility',
      name: 'Utility & Sanitation',
      hindiName: 'उपयोगिता एवं स्वच्छता',
      count: 60,
      accentColor: '#d946ef',
      bgGlow: 'rgba(217, 70, 239, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d946ef" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
      bannerTheme: 'utility',
      description: 'Swachh Bharat rural bio-toilets, solar water pumps, Jal Jeevan Mission piped tap water, and biogas digester grants.'
    },
    {
      id: 'women_child',
      name: 'Women and Child',
      hindiName: 'महिला एवं बाल विकास',
      count: 472,
      accentColor: '#38bdf8',
      bgGlow: 'rgba(56, 189, 248, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><circle cx="12" cy="11" r="2"/></svg>`,
      bannerTheme: 'women_child',
      description: 'Mahila Kisan Sashaktikaran Pariyojana, priority women credit subventions, nutrition kits, and girl child educational bonds.'
    }
  ];

  // Flagship Category Schemes matching Images 3 and 4
  window.FLAGSHIP_CATEGORY_SCHEMES = [
    // Image 3: Agriculture, Rural & Environment
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
      id: 'cat-agri-krishi-vigyan',
      categoryId: 'agriculture',
      title: 'Rashtriya Krishi Vigyan Puraskar',
      ministry: 'Ministry Of Agriculture and Farmers Welfare',
      description: 'Instituted to recognize outstanding contributions by Indian agricultural scientists, extension workers, and innovative farmers who enhance farm yield, soil organic carbon, and climate-resilient farming techniques.',
      tags: ['Agriculture', 'Award', 'Farmer', 'Innovation'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Cash Grant & Citation',
      applyUrl: 'https://agricoop.nic.in/'
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
      description: 'Remunerative approaches for agriculture and allied sector rejuvenation. Provides up to 50% capital subsidy for farm mechanization, solar pump sets, and farmer producer organization (FPO) development.',
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

    // Image 4: Business & Entrepreneurship
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
      id: 'cat-biz-pm-virasat',
      categoryId: 'business',
      title: 'Pradhan Mantri Virasat ka Samvardhan (PM VIKAS)',
      ministry: 'Ministry Of Minority Affairs',
      description: 'Convergence of five erstwhile schemes into an integrated livelihood initiative offering credit linkages, market support, artisan training, and modern design laboratories for rural craftspeople and young entrepreneurs.',
      tags: ['Business', 'Entrepreneurship', 'Credit Linkage', 'Skill'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Soft Credit & Grant',
      applyUrl: 'https://www.minorityaffairs.gov.in/'
    },
    {
      id: 'cat-biz-mudra',
      categoryId: 'business',
      title: 'Pradhan Mantri MUDRA Yojana (Shishu, Kishore, Tarun)',
      ministry: 'Ministry Of Finance',
      description: 'Collateral-free loans up to ₹10 Lakhs (extended up to ₹20 Lakhs) for micro and small enterprises in non-corporate, non-farm sectors at competitive bank interest rates.',
      tags: ['Business', 'Loan', 'Collateral-Free', 'Mudra'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Loan up to ₹20 Lakhs',
      applyUrl: 'https://www.mudra.org.in/'
    },
    {
      id: 'cat-biz-startup-seed',
      categoryId: 'business',
      title: 'Startup India Seed Fund Scheme (SISFS)',
      ministry: 'Department for Promotion of Industry and Internal Trade',
      description: 'Financial assistance up to ₹20 Lakhs as a grant for proof of concept, prototype development, and product trials, and up to ₹50 Lakhs for market entry and commercialization via convertible debentures.',
      tags: ['Startup', 'Seed Fund', 'Innovation', 'Grant'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: 'Up to ₹50 Lakhs Grant/Debt',
      applyUrl: 'https://seedfund.startupindia.gov.in/'
    },

    // Banking, Financial Services and Insurance
    {
      id: 'cat-bank-kcc',
      categoryId: 'banking',
      title: 'Kisan Credit Card (KCC) Interest Subvention Scheme',
      ministry: 'Ministry Of Finance & NABARD',
      description: 'Short-term agricultural production credit up to ₹3,00,000 at a concessional net rate of 4% per annum upon prompt repayment, with collateral-free borrowing up to ₹1,60,000.',
      tags: ['Banking', 'Credit', 'Crop Loan', 'Subvention'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '4% Concessional Interest',
      applyUrl: 'https://www.nabard.org/'
    },
    {
      id: 'cat-bank-pmjdy',
      categoryId: 'banking',
      title: 'Pradhan Mantri Jan Dhan Yojana (PMJDY)',
      ministry: 'Ministry Of Finance',
      description: 'National mission for financial inclusion ensuring access to financial services, namely, a zero-balance basic savings account, remittance, credit, insurance of ₹2 Lakhs, and ₹10,000 overdraft facility.',
      tags: ['Banking', 'Overdraft', 'Zero Balance', 'Insurance'],
      scope: 'central',
      state: 'Central',
      gender: 'all',
      benefitType: '₹10,000 Overdraft + RuPay Insurance',
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

    // Women and Child
    {
      id: 'cat-women-mksy',
      categoryId: 'women_child',
      title: 'Mahila Kisan Sashaktikaran Pariyojana (MKSP)',
      ministry: 'Ministry Of Rural Development',
      description: 'Empowers rural women in agriculture by making systematic investments to enhance their participation and productivity, promoting sustainable agro-ecological practices through self-help groups (SHGs).',
      tags: ['Women', 'Empowerment', 'Agriculture', 'SHG'],
      scope: 'central',
      state: 'Central',
      gender: 'female',
      benefitType: 'Training, Seed Grant & Tools',
      applyUrl: 'https://aajeevika.gov.in/'
    },
    {
      id: 'cat-women-pmmvy',
      categoryId: 'women_child',
      title: 'Pradhan Mantri Matru Vandana Yojana (PMMVY)',
      ministry: 'Ministry Of Women and Child Development',
      description: 'Maternity benefit cash incentive of ₹5,000 directly transferred to pregnant women and lactating mothers for wage loss compensation and nutritional fulfillment.',
      tags: ['Women', 'Maternity', 'DBT', 'Nutrition'],
      scope: 'central',
      state: 'Central',
      gender: 'female',
      benefitType: '₹5,000 Cash Transfer',
      applyUrl: 'https://pmmvy.wcd.gov.in/'
    }
  ];

  

  // ==========================================================================
  // THEMED ILLUSTRATED HERO BANNERS (High-Fidelity Vector SVGs for All 15 Terms)
  // Designed for pixel-perfect contrast in both Dark and Light modes.
  // ==========================================================================
  window.CATEGORY_HERO_BANNERS = {
    // 1. Agriculture, Rural & Environment (Image 3)
    agriculture: `
      <div class="category-hero-art-wrapper theme-agri">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#agriSkyGrad)"/>
          <path d="M0 240L0 190C180 180 320 210 520 185C740 160 900 190 1200 175V240H0Z" fill="#133e24" fill-opacity="0.9"/>
          <path d="M0 240L0 205C240 195 480 220 720 200C960 180 1100 215 1200 210V240H0Z" fill="#0d2b19"/>
          <circle cx="560" cy="180" r="130" fill="#d9f99d" fill-opacity="0.22"/>
          <g opacity="0.85">
            <path d="M500 190C495 150 515 130 525 120C535 130 555 150 550 190H500Z" fill="#22c55e"/>
            <path d="M535 195C530 145 550 125 560 115C570 125 590 145 585 195H535Z" fill="#16a34a"/>
            <path d="M570 190C565 140 585 120 595 110C605 120 625 140 620 190H570Z" fill="#15803d"/>
            <path d="M780 190C775 140 795 120 805 110C815 120 835 140 830 190H780Z" fill="#16a34a"/>
          </g>
          <g transform="translate(980, 50)" stroke="#e2e8f0" stroke-width="2" opacity="0.85">
            <line x1="40" y1="140" x2="25" y2="40"/><line x1="40" y1="140" x2="55" y2="40"/>
            <line x1="28" y1="70" x2="52" y2="70"/><line x1="33" y1="105" x2="47" y2="105"/>
            <circle cx="40" cy="38" r="6" fill="#ffffff"/>
            <line x1="40" y1="38" x2="40" y2="5" stroke-width="3"/>
            <line x1="40" y1="38" x2="68" y2="54" stroke-width="3"/>
            <line x1="40" y1="38" x2="12" y2="54" stroke-width="3"/>
          </g>
          <g transform="translate(680, 75)">
            <rect x="155" y="15" width="6" height="35" rx="3" fill="#334155"/>
            <path d="M100 48H165C170 48 174 52 174 58V88H100V48Z" fill="#84cc16"/>
            <rect x="170" y="52" width="6" height="32" rx="2" fill="#1e293b"/>
            <circle cx="172" cy="58" r="4" fill="#fef08a"/>
            <path d="M55 25H102V88H55V25Z" fill="#4d7c0f"/>
            <path d="M60 30H97V60H60V30Z" fill="#bae6fd" opacity="0.9"/>
            <path d="M48 22H110C112 22 114 24 114 26V28H46V26C46 24 48 22 48 22Z" fill="#365314"/>
            <circle cx="65" cy="98" r="38" fill="#1e293b"/><circle cx="65" cy="98" r="24" fill="#cbd5e1"/><circle cx="65" cy="98" r="10" fill="#0f172a"/>
            <path d="M65 60V74M65 122V136M27 98H41M89 98H103" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
            <circle cx="155" cy="108" r="24" fill="#1e293b"/><circle cx="155" cy="108" r="14" fill="#cbd5e1"/><circle cx="155" cy="108" r="6" fill="#0f172a"/>
          </g>
          <defs>
            <linearGradient id="agriSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#052e16"/><stop offset="60%" stop-color="#064e3b"/><stop offset="100%" stop-color="#022c22"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 2. Banking, Financial Services & Insurance
    banking: `
      <div class="category-hero-art-wrapper theme-banking">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#bankSkyGrad)"/>
          <circle cx="1000" cy="120" r="160" fill="#3b82f6" fill-opacity="0.15"/>
          <!-- Classical Bank Columns & Facade -->
          <g transform="translate(620, 45)">
            <polygon points="100,10 0,60 200,60" fill="#1e3a8a"/>
            <rect x="10" y="60" width="180" height="12" fill="#3b82f6"/>
            <!-- 4 Pillars -->
            <rect x="25" y="72" width="22" height="85" rx="3" fill="#cbd5e1"/>
            <rect x="68" y="72" width="22" height="85" rx="3" fill="#cbd5e1"/>
            <rect x="110" y="72" width="22" height="85" rx="3" fill="#cbd5e1"/>
            <rect x="153" y="72" width="22" height="85" rx="3" fill="#cbd5e1"/>
            <rect x="0" y="157" width="200" height="15" fill="#1e3a8a"/>
          </g>
          <!-- Central Digital Rupee Security Shield -->
          <g transform="translate(850, 40)">
            <path d="M60 10L120 35V95C120 145 60 175 60 175C60 175 0 145 0 95V35L60 10Z" fill="#1d4ed8"/>
            <path d="M60 20L108 42V92C108 135 60 162 60 162C60 162 12 135 12 92V42L60 20Z" fill="#2563eb"/>
            <!-- Rupee Symbol ₹ in Shield -->
            <text x="43" y="105" fill="#facc15" font-family="'Plus Jakarta Sans', sans-serif" font-size="52" font-weight="900">₹</text>
          </g>
          <!-- Stacks of Golden Coins & Umbrella -->
          <g transform="translate(1000, 70)">
            <!-- Insurance Umbrella -->
            <path d="M60 20C20 20 5 55 5 55H115C115 55 100 20 60 20Z" fill="#38bdf8"/>
            <line x1="60" y1="20" x2="60" y2="85" stroke="#e2e8f0" stroke-width="4"/>
            <path d="M60 85C60 92 68 92 68 85" stroke="#e2e8f0" stroke-width="4" fill="none"/>
            <!-- Golden Coins -->
            <ellipse cx="60" cy="115" rx="35" ry="12" fill="#eab308"/>
            <ellipse cx="60" cy="110" rx="35" ry="12" fill="#facc15"/>
            <ellipse cx="60" cy="100" rx="30" ry="10" fill="#fde047"/>
          </g>
          <defs>
            <linearGradient id="bankSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0b1329"/><stop offset="60%" stop-color="#1e293b"/><stop offset="100%" stop-color="#1e3a8a"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 3. Business & Entrepreneurship (Image 4)
    business: `
      <div class="category-hero-art-wrapper theme-biz">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#bizSkyGrad)"/>
          <g transform="translate(540, 45)" opacity="0.9">
            <rect x="0" y="110" width="22" height="60" rx="4" fill="#38bdf8"/>
            <rect x="30" y="80" width="22" height="90" rx="4" fill="#38bdf8"/>
            <rect x="60" y="55" width="22" height="115" rx="4" fill="#38bdf8"/>
            <rect x="90" y="30" width="22" height="140" rx="4" fill="#38bdf8"/>
            <rect x="120" y="5" width="22" height="165" rx="4" fill="#f8fafc"/>
            <path d="M-10 120 Q60 50 145 0" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" fill="none"/>
            <polygon points="145,0 130,5 140,15" fill="#38bdf8"/>
          </g>
          <g transform="translate(680, 40)">
            <path d="M10 160L210 160L230 175H0L10 160Z" fill="#334155"/>
            <rect x="25" y="40" width="170" height="120" rx="6" fill="#1e293b"/>
            <rect x="32" y="47" width="156" height="106" rx="4" fill="#0f172a"/>
            <text x="42" y="85" fill="#ffffff" font-family="'Outfit', sans-serif" font-size="24" font-weight="800">START</text>
            <text x="42" y="115" fill="#38bdf8" font-family="'Outfit', sans-serif" font-size="26" font-weight="900">UP</text>
            <ellipse cx="145" cy="140" rx="45" ry="25" fill="#f8fafc" opacity="0.95"/>
            <g transform="translate(135, 10) rotate(5)">
              <polygon points="12,75 20,105 28,75" fill="#f59e0b"/>
              <polygon points="15,75 20,95 25,75" fill="#ef4444"/>
              <path d="M20 0C10 20 5 45 5 75H35C35 45 30 20 20 0Z" fill="#f8fafc"/>
              <path d="M20 0C14 12 10 22 10 32H30C30 22 26 12 20 0Z" fill="#ef4444"/>
              <circle cx="20" cy="42" r="7" fill="#0284c7"/>
            </g>
          </g>
          <g transform="translate(930, 65)">
            <circle cx="30" cy="22" r="10" fill="#fbcfe8"/>
            <path d="M20 18C20 12 28 10 35 12C38 15 38 22 36 24C34 20 30 18 20 18Z" fill="#1e293b"/>
            <path d="M18 34C18 30 42 30 42 34L40 85H20L18 34Z" fill="#cbd5e1"/>
            <rect x="5" y="44" width="8" height="15" rx="2" fill="#38bdf8"/>
            <rect x="22" y="85" width="7" height="55" fill="#1e293b"/>
            <rect x="31" y="85" width="7" height="55" fill="#1e293b"/>
          </g>
          <defs>
            <linearGradient id="bizSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#090d16"/><stop offset="60%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 4. Education & Learning
    education: `
      <div class="category-hero-art-wrapper theme-edu">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#eduSkyGrad)"/>
          <circle cx="950" cy="110" r="150" fill="#f43f5e" fill-opacity="0.15"/>
          <!-- Glowing Open Digital Book -->
          <g transform="translate(680, 50)">
            <path d="M10 130C60 110 110 120 130 140C150 120 200 110 250 130V30C200 10 150 20 130 40C110 20 60 10 10 30Z" fill="#1e1b4b"/>
            <path d="M15 125C62 107 108 117 128 135C148 117 194 107 245 125V35C194 17 148 27 128 45C108 27 62 17 15 35Z" fill="#f8fafc"/>
            <line x1="128" y1="45" x2="128" y2="135" stroke="#cbd5e1" stroke-width="2"/>
            <!-- Text Lines on Pages -->
            <line x1="30" y1="55" x2="110" y2="55" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/>
            <line x1="30" y1="75" x2="110" y2="75" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="30" y1="95" x2="90" y2="95" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="145" y1="55" x2="225" y2="55" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
            <line x1="145" y1="75" x2="225" y2="75" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="145" y1="95" x2="205" y2="95" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
          </g>
          <!-- Graduation Cap (Mortarboard) -->
          <g transform="translate(930, 45)">
            <polygon points="90,15 0,55 90,95 180,55" fill="#f43f5e"/>
            <path d="M40 70V110C40 130 140 130 140 110V70" fill="#be123c"/>
            <circle cx="90" cy="55" r="7" fill="#facc15"/>
            <line x1="90" y1="55" x2="155" y2="85" stroke="#facc15" stroke-width="3.5"/>
            <rect x="150" y="85" width="10" height="20" fill="#facc15" rx="2"/>
          </g>
          <defs>
            <linearGradient id="eduSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e1b4b"/><stop offset="60%" stop-color="#312e81"/><stop offset="100%" stop-color="#4c1d95"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 5. Health & Wellness
    health: `
      <div class="category-hero-art-wrapper theme-health">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#healthSkyGrad)"/>
          <circle cx="980" cy="120" r="150" fill="#0ea5e9" fill-opacity="0.15"/>
          <!-- Central Red & Blue Medical Shield -->
          <g transform="translate(700, 35)">
            <path d="M75 10L145 40V100C145 155 75 185 75 185C75 185 5 155 5 100V40L75 10Z" fill="#0284c7"/>
            <path d="M75 22L132 48V96C132 143 75 168 75 168C75 168 18 143 18 96V48L75 22Z" fill="#f8fafc"/>
            <rect x="63" y="55" width="24" height="70" rx="4" fill="#ef4444"/>
            <rect x="40" y="78" width="70" height="24" rx="4" fill="#ef4444"/>
          </g>
          <!-- EKG Heartbeat Pulse Waveform -->
          <g transform="translate(860, 95)" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path d="M0 40H60L75 0L95 80L115 20L130 50L145 40H220"/>
          </g>
          <!-- Stethoscope -->
          <g transform="translate(1000, 60)" stroke="#e2e8f0" stroke-width="3" fill="none">
            <path d="M30 20V60C30 85 80 85 80 60V20"/>
            <path d="M55 75V110C55 125 75 125 75 125"/>
            <circle cx="85" cy="125" r="10" fill="#38bdf8" stroke="#ffffff"/>
          </g>
          <defs>
            <linearGradient id="healthSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#042f2e"/><stop offset="60%" stop-color="#0f766e"/><stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 6. Housing & Shelter
    housing: `
      <div class="category-hero-art-wrapper theme-housing">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#houseSkyGrad)"/>
          <!-- Pucca House with Solar Roof -->
          <g transform="translate(720, 50)">
            <polygon points="100,10 0,65 200,65" fill="#3b82f6"/>
            <!-- Solar Panels on Roof -->
            <rect x="40" y="25" width="50" height="30" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5"/>
            <rect x="110" y="25" width="50" height="30" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5"/>
            <!-- Main Wall -->
            <rect x="20" y="65" width="160" height="100" fill="#f8fafc"/>
            <!-- Door -->
            <rect x="80" y="105" width="40" height="60" rx="3" fill="#d97706"/>
            <circle cx="112" cy="135" r="3" fill="#ffffff"/>
            <!-- Windows -->
            <rect x="35" y="85" width="30" height="30" rx="2" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
            <rect x="135" y="85" width="30" height="30" rx="2" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
          </g>
          <!-- Golden Key Symbol -->
          <g transform="translate(960, 65)">
            <circle cx="40" cy="40" r="22" stroke="#facc15" stroke-width="8" fill="none"/>
            <rect x="58" y="36" width="60" height="8" fill="#facc15"/>
            <rect x="95" y="44" width="8" height="14" fill="#facc15"/>
            <rect x="110" y="44" width="8" height="18" fill="#facc15"/>
          </g>
          <defs>
            <linearGradient id="houseSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f172a"/><stop offset="60%" stop-color="#1e293b"/><stop offset="100%" stop-color="#1e3a8a"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 7. Public Safety, Law & Justice
    justice: `
      <div class="category-hero-art-wrapper theme-justice">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#justiceSkyGrad)"/>
          <!-- Scales of Justice -->
          <g transform="translate(740, 45)" stroke="#facc15" stroke-width="3.5" fill="none">
            <line x1="100" y1="20" x2="100" y2="150" stroke-width="5"/>
            <line x1="30" y1="40" x2="170" y2="40" stroke-width="5"/>
            <!-- Left Pan -->
            <line x1="30" y1="40" x2="10" y2="90"/><line x1="30" y1="40" x2="50" y2="90"/>
            <path d="M5 90 Q30 115 55 90 Z" fill="#facc15"/>
            <!-- Right Pan -->
            <line x1="170" y1="40" x2="150" y2="90"/><line x1="170" y1="40" x2="190" y2="90"/>
            <path d="M145 90 Q170 115 195 90 Z" fill="#facc15"/>
            <!-- Base -->
            <rect x="70" y="150" width="60" height="15" fill="#facc15" stroke="none" rx="2"/>
          </g>
          <!-- Gavel on Sounding Block -->
          <g transform="translate(980, 75)">
            <rect x="0" y="70" width="70" height="16" rx="3" fill="#78350f"/>
            <g transform="rotate(-30 40 40)">
              <rect x="25" y="10" width="30" height="50" rx="4" fill="#92400e" stroke="#fef3c7" stroke-width="2"/>
              <rect x="36" y="55" width="8" height="60" fill="#b45309"/>
            </g>
          </g>
          <defs>
            <linearGradient id="justiceSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#450a0a"/><stop offset="60%" stop-color="#7f1d1d"/><stop offset="100%" stop-color="#991b1b"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 8. Science, IT & Communications
    science: `
      <div class="category-hero-art-wrapper theme-science">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#scienceSkyGrad)"/>
          <!-- Orbiting Atom Structure -->
          <g transform="translate(720, 50)">
            <circle cx="80" cy="70" r="18" fill="#38bdf8"/>
            <ellipse cx="80" cy="70" rx="75" ry="25" stroke="#38bdf8" stroke-width="2" fill="none" transform="rotate(30 80 70)"/>
            <ellipse cx="80" cy="70" rx="75" ry="25" stroke="#818cf8" stroke-width="2" fill="none" transform="rotate(-30 80 70)"/>
            <ellipse cx="80" cy="70" rx="75" ry="25" stroke="#34d399" stroke-width="2" fill="none" transform="rotate(90 80 70)"/>
            <circle cx="140" cy="100" r="5" fill="#facc15"/>
            <circle cx="30" cy="40" r="5" fill="#34d399"/>
          </g>
          <!-- Satellite Dish Beaming Data -->
          <g transform="translate(960, 45)">
            <path d="M30 110C30 60 75 25 120 40" stroke="#f8fafc" stroke-width="6" fill="none"/>
            <line x1="75" y1="75" x2="110" y2="50" stroke="#38bdf8" stroke-width="4"/>
            <circle cx="112" cy="48" r="6" fill="#f43f5e"/>
            <!-- Signals -->
            <path d="M115 35C125 25 140 25 150 35" stroke="#38bdf8" stroke-width="3" fill="none"/>
            <path d="M125 20C145 10 165 10 180 20" stroke="#38bdf8" stroke-width="3" fill="none"/>
            <!-- Mount Base -->
            <line x1="50" y1="100" x2="30" y2="150" stroke="#94a3b8" stroke-width="5"/>
            <line x1="50" y1="100" x2="70" y2="150" stroke="#94a3b8" stroke-width="5"/>
          </g>
          <defs>
            <linearGradient id="scienceSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#030712"/><stop offset="60%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e1b4b"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 9. Skills & Employment
    skills: `
      <div class="category-hero-art-wrapper theme-skills">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#skillsSkyGrad)"/>
          <!-- Interlocking Gears -->
          <g transform="translate(730, 45)" fill="#eab308">
            <circle cx="60" cy="60" r="45" fill="#ca8a04"/>
            <circle cx="60" cy="60" r="22" fill="#18181b"/>
            <rect x="52" y="5" width="16" height="110" rx="3" fill="#ca8a04"/>
            <rect x="5" y="52" width="110" height="16" rx="3" fill="#ca8a04"/>
            <!-- Smaller interlocking gear -->
            <g transform="translate(90, 70)">
              <circle cx="40" cy="40" r="32" fill="#eab308"/>
              <circle cx="40" cy="40" r="16" fill="#18181b"/>
              <rect x="34" y="2" width="12" height="76" rx="2" fill="#eab308"/>
              <rect x="2" y="34" width="76" height="12" rx="2" fill="#eab308"/>
            </g>
          </g>
          <!-- Engineer Hard Hat & Certificate -->
          <g transform="translate(970, 60)">
            <!-- Hard Hat -->
            <path d="M10 50C10 20 70 20 70 50H5C5 55 75 55 75 50" fill="#facc15"/>
            <rect x="0" y="50" width="80" height="6" rx="2" fill="#eab308"/>
            <!-- Parchment Certificate -->
            <rect x="85" y="25" width="55" height="75" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
            <line x1="95" y1="40" x2="130" y2="40" stroke="#0f172a" stroke-width="2"/>
            <line x1="95" y1="52" x2="130" y2="52" stroke="#64748b" stroke-width="2"/>
            <circle cx="112" cy="78" r="8" fill="#ef4444"/>
          </g>
          <defs>
            <linearGradient id="skillsSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#18181b"/><stop offset="60%" stop-color="#27272a"/><stop offset="100%" stop-color="#713f12"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 10. Social welfare & Empowerment
    social: `
      <div class="category-hero-art-wrapper theme-social">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#socialSkyGrad)"/>
          <!-- Caring Supporting Hands -->
          <g transform="translate(730, 45)" fill="#fb923c">
            <path d="M20 140C20 90 70 70 110 50L130 90C100 100 70 120 70 150H20Z"/>
            <path d="M220 140C220 90 170 70 130 50L110 90C140 100 170 120 170 150H220Z"/>
            <!-- Heart in Palms -->
            <path d="M120 40C110 20 85 25 85 45C85 65 120 90 120 90C120 90 155 65 155 45C155 25 130 20 120 40Z" fill="#ef4444"/>
          </g>
          <!-- Community Unity Silhouettes -->
          <g transform="translate(960, 60)" fill="#fdba74">
            <circle cx="20" cy="20" r="10"/><path d="M5 50C5 35 35 35 35 50V90H5Z"/>
            <circle cx="50" cy="15" r="12"/><path d="M35 50C35 32 65 32 65 50V90H35Z"/>
            <circle cx="80" cy="20" r="10"/><path d="M65 50C65 35 95 35 95 50V90H65Z"/>
          </g>
          <defs>
            <linearGradient id="socialSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#431407"/><stop offset="60%" stop-color="#7c2d12"/><stop offset="100%" stop-color="#9a3412"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 11. Sports & Culture
    sports: `
      <div class="category-hero-art-wrapper theme-sports">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#sportsSkyGrad)"/>
          <!-- Olympic Torch & Flame -->
          <g transform="translate(730, 45)">
            <path d="M40 80L30 160H50L40 80Z" fill="#78716c"/>
            <path d="M25 80H55L50 60H30L25 80Z" fill="#d6d3d1"/>
            <!-- Flaming Fire -->
            <path d="M40 10C25 30 20 50 35 60C45 50 55 40 40 10Z" fill="#f59e0b"/>
            <path d="M40 20C48 35 48 45 40 55C35 48 35 40 40 20Z" fill="#ef4444"/>
          </g>
          <!-- Sports Equipment (Football, Archery) -->
          <g transform="translate(860, 65)">
            <circle cx="45" cy="55" r="35" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
            <polygon points="45,35 30,45 35,62 55,62 60,45" fill="#0f172a"/>
          </g>
          <!-- Champion Medal with Ribbon -->
          <g transform="translate(1010, 50)">
            <polygon points="10,0 25,60 0,60" fill="#ef4444"/>
            <polygon points="40,0 25,60 50,60" fill="#3b82f6"/>
            <circle cx="25" cy="85" r="25" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
            <text x="18" y="93" fill="#854d0e" font-family="'Outfit', sans-serif" font-size="22" font-weight="900">1</text>
          </g>
          <defs>
            <linearGradient id="sportsSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#052e16"/><stop offset="60%" stop-color="#14532d"/><stop offset="100%" stop-color="#15803d"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 12. Transport & Infrastructure
    transport: `
      <div class="category-hero-art-wrapper theme-transport">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#transSkyGrad)"/>
          <!-- Expressway Bridge Road -->
          <path d="M500 240L650 160L900 160L1200 240H500Z" fill="#1e293b"/>
          <line x1="775" y1="160" x2="850" y2="240" stroke="#facc15" stroke-width="4" stroke-dasharray="15 15"/>
          <!-- Modern Cargo Logistics Truck -->
          <g transform="translate(680, 85)">
            <rect x="0" y="20" width="130" height="55" rx="3" fill="#2563eb"/>
            <path d="M130 35H165C170 35 174 40 174 45V75H130V35Z" fill="#38bdf8"/>
            <rect x="140" y="40" width="22" height="18" rx="2" fill="#0f172a"/>
            <!-- Wheels -->
            <circle cx="25" cy="78" r="14" fill="#0f172a"/><circle cx="25" cy="78" r="6" fill="#cbd5e1"/>
            <circle cx="55" cy="78" r="14" fill="#0f172a"/><circle cx="55" cy="78" r="6" fill="#cbd5e1"/>
            <circle cx="150" cy="78" r="14" fill="#0f172a"/><circle cx="150" cy="78" r="6" fill="#cbd5e1"/>
          </g>
          <!-- Streamlined Train Silhouette -->
          <g transform="translate(930, 60)">
            <path d="M0 60H160C190 60 210 75 220 90H0V60Z" fill="#f8fafc"/>
            <rect x="20" y="65" width="25" height="12" fill="#0284c7"/>
            <rect x="55" y="65" width="25" height="12" fill="#0284c7"/>
            <rect x="90" y="65" width="25" height="12" fill="#0284c7"/>
            <rect x="125" y="65" width="25" height="12" fill="#0284c7"/>
            <path d="M160 65H180L190 77H160V65Z" fill="#0284c7"/>
          </g>
          <defs>
            <linearGradient id="transSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f172a"/><stop offset="60%" stop-color="#1e293b"/><stop offset="100%" stop-color="#2563eb"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 13. Travel & Tourism
    tourism: `
      <div class="category-hero-art-wrapper theme-tourism">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#tourSkyGrad)"/>
          <circle cx="680" cy="180" r="120" fill="#fb7185" fill-opacity="0.3"/>
          <!-- Indian Heritage Palace Dome & Minarets -->
          <g transform="translate(730, 45)">
            <path d="M80 50C80 20 100 10 100 0C100 10 120 20 120 50H80Z" fill="#fbcfe8"/>
            <rect x="80" y="50" width="40" height="70" fill="#f43f5e"/>
            <path d="M90 85A10 10 0 0 1 110 85V120H90Z" fill="#881337"/>
            <!-- Left Tower -->
            <rect x="40" y="40" width="16" height="80" fill="#fda4af"/>
            <path d="M40 40C40 25 48 15 48 15C48 15 56 25 56 40Z" fill="#f43f5e"/>
            <!-- Right Tower -->
            <rect x="144" y="40" width="16" height="80" fill="#fda4af"/>
            <path d="M144 40C144 25 152 15 152 15C152 15 160 25 160 40Z" fill="#f43f5e"/>
          </g>
          <!-- Travel Suitcase & Jet Airplane -->
          <g transform="translate(970, 60)">
            <!-- Jet Airplane -->
            <path d="M40 0L50 25L85 30L50 35L45 50L35 35L15 32L35 25Z" fill="#ffffff"/>
            <path d="M0 45 Q20 30 40 10" stroke="#f8fafc" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
            <!-- Suitcase -->
            <rect x="40" y="55" width="60" height="45" rx="5" fill="#f59e0b"/>
            <rect x="60" y="47" width="20" height="8" rx="2" fill="#78350f"/>
            <line x1="55" y1="55" x2="55" y2="100" stroke="#78350f" stroke-width="2"/>
            <line x1="85" y1="55" x2="85" y2="100" stroke="#78350f" stroke-width="2"/>
          </g>
          <defs>
            <linearGradient id="tourSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4c0519"/><stop offset="60%" stop-color="#831843"/><stop offset="100%" stop-color="#9d174d"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 14. Utility & Sanitation
    utility: `
      <div class="category-hero-art-wrapper theme-utility">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#utilSkyGrad)"/>
          <!-- Gushing Water Tap & Droplets -->
          <g transform="translate(740, 50)">
            <rect x="0" y="30" width="70" height="20" rx="3" fill="#cbd5e1"/>
            <path d="M50 30V65H35V30" fill="#94a3b8"/>
            <path d="M42 65L42 120" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
            <path d="M42 125C30 125 25 140 25 145C25 155 33 160 42 160C51 160 59 155 59 145C59 140 54 125 42 125Z" fill="#38bdf8"/>
            <circle cx="80" cy="110" r="10" fill="#38bdf8" fill-opacity="0.6"/>
            <circle cx="100" cy="85" r="6" fill="#38bdf8" fill-opacity="0.8"/>
          </g>
          <!-- Eco Solar Panel & Green Leaf Recycle -->
          <g transform="translate(950, 60)">
            <polygon points="30,10 90,10 110,60 10,60" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <line x1="20" y1="35" x2="100" y2="35" stroke="#38bdf8" stroke-width="2"/>
            <line x1="60" y1="10" x2="60" y2="60" stroke="#38bdf8" stroke-width="2"/>
            <!-- Eco Leaf Badge -->
            <path d="M90 75C90 55 125 50 135 45C135 75 115 95 90 75Z" fill="#22c55e"/>
            <line x1="90" y1="75" x2="125" y2="55" stroke="#ffffff" stroke-width="2"/>
          </g>
          <defs>
            <linearGradient id="utilSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#083344"/><stop offset="60%" stop-color="#155e75"/><stop offset="100%" stop-color="#0e7490"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // 15. Women and Child
    women_child: `
      <div class="category-hero-art-wrapper theme-women">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#womenSkyGrad)"/>
          <circle cx="950" cy="120" r="150" fill="#c084fc" fill-opacity="0.18"/>
          <!-- Mother and Child Silhouette in Loving Embrace -->
          <g transform="translate(740, 45)" fill="#f472b6">
            <!-- Mother -->
            <circle cx="65" cy="30" r="16" fill="#fbcfe8"/>
            <path d="M45 25C45 10 85 10 85 25C85 35 75 42 65 42C55 42 45 35 45 25Z" fill="#3b0764"/>
            <path d="M40 50C40 40 90 40 90 50L85 125H45L40 50Z" fill="#ec4899"/>
            <!-- Child -->
            <circle cx="100" cy="65" r="12" fill="#fbcfe8"/>
            <path d="M85 85C85 75 115 75 115 85L110 125H90L85 85Z" fill="#a855f7"/>
          </g>
          <!-- Empowerment Starburst & Protective Canopy -->
          <g transform="translate(960, 55)">
            <circle cx="50" cy="50" r="28" fill="#facc15" fill-opacity="0.2"/>
            <path d="M50 15L55 40L80 45L58 58L65 82L45 68L25 80L32 55L12 45L38 40Z" fill="#facc15"/>
            <!-- Tender Lotus Petals -->
            <path d="M30 95C30 80 50 75 50 75C50 75 70 80 70 95H30Z" fill="#f472b6"/>
          </g>
          <defs>
            <linearGradient id="womenSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3b0764"/><stop offset="60%" stop-color="#581c87"/><stop offset="100%" stop-color="#7e22ce"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // Universal Fallback / Other Categories Banner
    default: `
      <div class="category-hero-art-wrapper theme-default">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="240" fill="url(#defaultSkyGrad)"/>
          <circle cx="950" cy="120" r="180" fill="#38bdf8" fill-opacity="0.12"/>
          <circle cx="1100" cy="80" r="100" fill="#10b981" fill-opacity="0.15"/>
          <path d="M0 240L300 180L650 210L1000 160L1200 200V240H0Z" fill="#0f172a" fill-opacity="0.8"/>
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
    const fallbackSvg = window.CATEGORY_HERO_BANNERS[categoryTheme] || window.CATEGORY_HERO_BANNERS.default;

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
