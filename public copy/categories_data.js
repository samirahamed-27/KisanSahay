/**
 * KisanSahay 15 National Scheme Categories & Flagship Scheme Directory
 * Matching reference screenshots (Images 1, 2, 3, 4, 5).
 */

(function () {
  'use strict';

  // 15 National Categories matching Image 5
  window.NATIONAL_CATEGORIES = [
    {
      id: 'agriculture',
      name: 'Agriculture,Rural & Environment',
      hindiName: 'कृषि, ग्रामीण एवं पर्यावरण',
      count: 909,
      accentColor: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M12 20V10"/><path d="M12 10a5 5 0 0 1-5-5c0-1.5.5-2.5 1-3 1.5 2 3.5 3 6 3s4.5-1 6-3c.5.5 1 1.5 1 3a5 5 0 0 1-5 5"/><path d="M5 20c0-4.5 3-7 7-7s7 2.5 7 7"/></svg>`,
      bannerTheme: 'agriculture',
      description: 'Comprehensive farm credit, crop subsidies, irrigation development, and sustainable rural livelihood initiatives.'
    },
    {
      id: 'banking',
      name: 'Banking,Financial Services and Insurance',
      hindiName: 'बैंकिंग, वित्तीय सेवाएं एवं बीमा',
      count: 354,
      accentColor: '#f97316',
      bgGlow: 'rgba(249, 115, 22, 0.15)',
      iconSvg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 10 12 3 19 10"/><line x1="7" y1="10" x2="7" y2="21"/><line x1="12" y1="10" x2="12" y2="21"/><line x1="17" y1="10" x2="17" y2="21"/></svg>`,
      bannerTheme: 'banking',
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
      name: 'Public Safety,Law & Justice',
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

  // Themed Illustrated Hero Banners (Vector SVGs matching Images 3 and 4)
  window.CATEGORY_HERO_BANNERS = {
    // Agriculture banner matching Image 3 (Dark & Light responsive vector artwork)
    agriculture: `
      <div class="category-hero-art-wrapper theme-agri">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Background sky / gradient -->
          <rect width="1200" height="240" fill="url(#agriSkyGrad)"/>
          
          <!-- Distant hills & soil curves -->
          <path d="M0 240L0 190C180 180 320 210 520 185C740 160 900 190 1200 175V240H0Z" fill="#133e24" fill-opacity="0.9"/>
          <path d="M0 240L0 205C240 195 480 220 720 200C960 180 1100 215 1200 210V240H0Z" fill="#0d2b19"/>

          <!-- Giant abstract sun/moon disc in background -->
          <circle cx="560" cy="180" r="130" fill="#d9f99d" fill-opacity="0.22"/>

          <!-- Stylized foliage & trees in background -->
          <g opacity="0.85">
            <path d="M500 190C495 150 515 130 525 120C535 130 555 150 550 190H500Z" fill="#22c55e"/>
            <path d="M535 195C530 145 550 125 560 115C570 125 590 145 585 195H535Z" fill="#16a34a"/>
            <path d="M570 190C565 140 585 120 595 110C605 120 625 140 620 190H570Z" fill="#15803d"/>
            <path d="M605 195C600 155 615 135 625 125C635 135 650 155 645 195H605Z" fill="#22c55e"/>
            <path d="M780 190C775 140 795 120 805 110C815 120 835 140 830 190H780Z" fill="#16a34a"/>
            <path d="M820 195C815 150 830 130 840 120C850 130 865 150 860 195H820Z" fill="#15803d"/>
          </g>

          <!-- Windmill (Right Side) -->
          <g transform="translate(980, 50)" stroke="#e2e8f0" stroke-width="2" opacity="0.85">
            <line x1="40" y1="140" x2="25" y2="40"/>
            <line x1="40" y1="140" x2="55" y2="40"/>
            <line x1="28" y1="70" x2="52" y2="70"/>
            <line x1="33" y1="105" x2="47" y2="105"/>
            <!-- Rotor blades -->
            <circle cx="40" cy="38" r="6" fill="#ffffff"/>
            <line x1="40" y1="38" x2="40" y2="5" stroke-width="3"/>
            <line x1="40" y1="38" x2="68" y2="54" stroke-width="3"/>
            <line x1="40" y1="38" x2="12" y2="54" stroke-width="3"/>
          </g>

          <!-- Modern Agricultural Green Tractor (Matching Image 3) -->
          <g transform="translate(680, 75)">
            <!-- Exhaust pipe -->
            <rect x="155" y="15" width="6" height="35" rx="3" fill="#334155"/>
            <path d="M153 15C153 10 163 10 163 15" stroke="#334155" stroke-width="3"/>

            <!-- Hood & Engine body -->
            <path d="M100 48H165C170 48 174 52 174 58V88H100V48Z" fill="#84cc16"/>
            <!-- Front grill -->
            <rect x="170" y="52" width="6" height="32" rx="2" fill="#1e293b"/>
            <!-- Headlight -->
            <circle cx="172" cy="58" r="4" fill="#fef08a"/>

            <!-- Driver Cabin -->
            <path d="M55 25H102V88H55V25Z" fill="#4d7c0f"/>
            <!-- Cabin Window Glass -->
            <path d="M60 30H97V60H60V30Z" fill="#bae6fd" opacity="0.9"/>
            <line x1="78" y1="30" x2="78" y2="60" stroke="#4d7c0f" stroke-width="2"/>
            <!-- Roof -->
            <path d="M48 22H110C112 22 114 24 114 26V28H46V26C46 24 48 22 48 22Z" fill="#365314"/>

            <!-- Big Rear Wheel -->
            <circle cx="65" cy="98" r="38" fill="#1e293b"/>
            <circle cx="65" cy="98" r="24" fill="#cbd5e1"/>
            <circle cx="65" cy="98" r="10" fill="#0f172a"/>
            <!-- Rear Wheel Treads -->
            <path d="M65 60V74M65 122V136M27 98H41M89 98H103" stroke="#334155" stroke-width="5" stroke-linecap="round"/>

            <!-- Small Front Wheel -->
            <circle cx="155" cy="108" r="24" fill="#1e293b"/>
            <circle cx="155" cy="108" r="14" fill="#cbd5e1"/>
            <circle cx="155" cy="108" r="6" fill="#0f172a"/>
          </g>

          <!-- Foreground organic leaves (Left Side) -->
          <g transform="translate(10, 0)" opacity="0.6">
            <path d="M0 0C40 30 70 80 50 140C20 120 0 60 0 0Z" fill="#84cc16"/>
            <path d="M60 0C100 40 110 100 80 150C60 110 40 70 60 0Z" fill="#4d7c0f"/>
            <path d="M120 10C160 50 150 110 120 140C100 110 90 70 120 10Z" fill="#65a30d"/>
          </g>

          <defs>
            <linearGradient id="agriSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#052e16"/>
              <stop offset="60%" stop-color="#064e3b"/>
              <stop offset="100%" stop-color="#022c22"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,

    // Business banner matching Image 4 (Rocket Launching from Laptop, Startup, Graphs, Floating Currency)
    business: `
      <div class="category-hero-art-wrapper theme-biz">
        <svg class="category-hero-svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Dark navy / slate canvas -->
          <rect width="1200" height="240" fill="url(#bizSkyGrad)"/>

          <!-- Floating Currency Notes (₹) in background -->
          <g opacity="0.35">
            <rect x="80" y="30" width="80" height="45" rx="4" fill="#334155" transform="rotate(-15 80 30)"/>
            <text x="110" y="60" fill="#94a3b8" font-size="20" font-weight="700" transform="rotate(-15 80 30)">₹</text>

            <rect x="420" y="40" width="90" height="50" rx="4" fill="#334155" transform="rotate(20 420 40)"/>
            <text x="455" y="72" fill="#94a3b8" font-size="22" font-weight="700" transform="rotate(20 420 40)">₹</text>

            <rect x="1060" y="70" width="95" height="52" rx="4" fill="#334155" transform="rotate(-12 1060 70)"/>
            <text x="1095" y="104" fill="#94a3b8" font-size="24" font-weight="700" transform="rotate(-12 1060 70)">₹</text>
          </g>

          <!-- Rising Financial Arrow & Bar Graph (Right Side) -->
          <g transform="translate(860, 50)" opacity="0.9">
            <!-- Bars -->
            <rect x="0" y="110" width="22" height="60" rx="4" fill="#475569"/>
            <rect x="30" y="90" width="22" height="80" rx="4" fill="#64748b"/>
            <rect x="60" y="60" width="22" height="110" rx="4" fill="#0284c7"/>
            <rect x="90" y="30" width="22" height="140" rx="4" fill="#38bdf8"/>
            <rect x="120" y="5" width="22" height="165" rx="4" fill="#f8fafc"/>
            <!-- Rising Growth Arrow -->
            <path d="M-10 120 Q60 50 145 0" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" fill="none"/>
            <polygon points="145,0 130,5 140,15" fill="#38bdf8"/>
          </g>

          <!-- Laptop with "START UP" screen & Rocket Launching (Matching Image 4) -->
          <g transform="translate(630, 40)">
            <!-- Laptop Base -->
            <path d="M10 160L210 160L230 175H0L10 160Z" fill="#334155"/>
            <!-- Laptop Screen Shell -->
            <rect x="25" y="40" width="170" height="120" rx="6" fill="#1e293b"/>
            <!-- Inner Screen Display -->
            <rect x="32" y="47" width="156" height="106" rx="4" fill="#0f172a"/>

            <!-- Bold "START UP" Typography on Screen -->
            <text x="42" y="85" fill="#ffffff" font-family="'Outfit', sans-serif" font-size="24" font-weight="800">START</text>
            <text x="42" y="115" fill="#38bdf8" font-family="'Outfit', sans-serif" font-size="26" font-weight="900">UP</text>

            <!-- White smoke / exhaust cloud from rocket -->
            <ellipse cx="145" cy="140" rx="45" ry="25" fill="#f8fafc" opacity="0.95"/>
            <ellipse cx="170" cy="135" rx="35" ry="20" fill="#cbd5e1" opacity="0.9"/>
            <ellipse cx="125" cy="135" rx="30" ry="18" fill="#e2e8f0" opacity="0.9"/>

            <!-- Rocket Launching diagonally -->
            <g transform="translate(135, 10) rotate(5)">
              <!-- Rocket Exhaust Fire -->
              <polygon points="12,75 20,105 28,75" fill="#f59e0b"/>
              <polygon points="15,75 20,95 25,75" fill="#ef4444"/>

              <!-- Rocket Body -->
              <path d="M20 0C10 20 5 45 5 75H35C35 45 30 20 20 0Z" fill="#f8fafc"/>
              <!-- Rocket Nose Cone -->
              <path d="M20 0C14 12 10 22 10 32H30C30 22 26 12 20 0Z" fill="#ef4444"/>
              <!-- Rocket Porthole Window -->
              <circle cx="20" cy="42" r="7" fill="#0284c7"/>
              <circle cx="20" cy="42" r="4" fill="#bae6fd"/>

              <!-- Rocket Wings -->
              <polygon points="5,55 -8,75 5,75" fill="#ef4444"/>
              <polygon points="35,55 48,75 35,75" fill="#ef4444"/>
            </g>
          </g>

          <!-- Standing Entrepreneur / Professional with Phone (Right side of Laptop) -->
          <g transform="translate(800, 65)">
            <!-- Head & Hair -->
            <circle cx="30" cy="22" r="10" fill="#fbcfe8"/>
            <path d="M20 18C20 12 28 10 35 12C38 15 38 22 36 24C34 20 30 18 20 18Z" fill="#1e293b"/>
            <!-- Torso / Jacket -->
            <path d="M18 34C18 30 42 30 42 34L40 85H20L18 34Z" fill="#cbd5e1"/>
            <!-- Smartphone in Hand -->
            <rect x="5" y="44" width="8" height="15" rx="2" fill="#38bdf8"/>
            <!-- Legs -->
            <rect x="22" y="85" width="7" height="55" fill="#1e293b"/>
            <rect x="31" y="85" width="7" height="55" fill="#1e293b"/>
          </g>

          <defs>
            <linearGradient id="bizSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#090d16"/>
              <stop offset="60%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#1e293b"/>
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
              <stop offset="0%" stop-color="#0b132b"/>
              <stop offset="50%" stop-color="#1c2541"/>
              <stop offset="100%" stop-color="#0b132b"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `
  };

  /**
   * Helper to retrieve banner HTML for any category
   */
  window.getCategoryBannerHtml = function (categoryTheme) {
    if (window.CATEGORY_HERO_BANNERS[categoryTheme]) {
      return window.CATEGORY_HERO_BANNERS[categoryTheme];
    }
    return window.CATEGORY_HERO_BANNERS.default;
  };
})();
